'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import { Users, Video, ExternalLink, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SectorData {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    member_count: number;
    video_count: number;
    galaxy_x: number;
    galaxy_y: number;
}

interface PlacedSector extends SectorData {
    wx: number;
    wz: number;
    radius: number;
    hue: number;
    seed: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COORD_SCALE   = 200;   // galaxy unit → world unit
const MIN_RADIUS    = 30;
const MAX_RADIUS    = 180;
const MAX_MEMBERS   = 100;
const MIN_GAP       = 50;
const ELEVATION_MIN = 0.18;  // ~10° from horizontal
const ELEVATION_MAX = 1.20;  // ~69°
const DIST_MIN      = 80;
const DIST_MAX      = 6000;

// ── Pure helpers ──────────────────────────────────────────────────────────────

function lcg(s: number) {
    let n = s | 0;
    return () => {
        n = Math.imul(1664525, n) + 1013904223 | 0;
        return (n >>> 0) / 0xFFFFFFFF;
    };
}

function computeRadius(members: number) {
    const t = Math.min(members, MAX_MEMBERS) / MAX_MEMBERS;
    return MIN_RADIUS + t * (MAX_RADIUS - MIN_RADIUS);
}

function slugToHue(slug: string) {
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffff;
    return h % 360;
}

function slugToSeed(slug: string) {
    return Math.abs(slug.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
}

function resolveOverlaps(sectors: PlacedSector[]): PlacedSector[] {
    const out = sectors.map(s => ({ ...s }));
    for (let iter = 0; iter < 100; iter++) {
        let moved = false;
        for (let i = 0; i < out.length; i++) {
            for (let j = i + 1; j < out.length; j++) {
                const dx = out[j].wx - out[i].wx;
                const dz = out[j].wz - out[i].wz;
                const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
                const minDist = out[i].radius + out[j].radius + MIN_GAP;
                if (dist < minDist) {
                    const push = (minDist - dist) / 2;
                    const nx = dx / dist, nz = dz / dist;
                    out[i].wx -= nx * push;
                    out[i].wz -= nz * push;
                    out[j].wx += nx * push;
                    out[j].wz += nz * push;
                    moved = true;
                }
            }
        }
        if (!moved) break;
    }
    return out;
}

// ── Three.js helpers (called after import) ────────────────────────────────────

function buildBlobShape(THREE: any, radius: number, seed: number, numPts = 10) {
    const rng = lcg(seed);
    const angles: number[] = [];
    const step = (Math.PI * 2) / numPts;
    for (let i = 0; i < numPts; i++)
        angles.push(i * step + (rng() - 0.5) * step * 0.45);
    const radii = angles.map(() => radius * (0.62 + rng() * 0.76));
    const pts = angles.map((a, i) => ({ x: radii[i] * Math.cos(a), y: radii[i] * Math.sin(a) }));
    const n = pts.length;

    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n];
        const p1 = pts[i];
        const p2 = pts[(i + 1) % n];
        const p3 = pts[(i + 2) % n];
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        shape.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
    shape.closePath();
    return shape;
}

function makeLabelSprite(THREE: any, text: string, hue: number) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 100;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 100);
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 14;
    ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = `hsl(${hue},80%,88%)`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 50);
    const tex = new THREE.CanvasTexture(cv);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    // Scale is set dynamically each frame; this is just an initial placeholder
    spr.scale.set(110, 22, 1);
    return spr;
}

function makeStarPoints(THREE: any, count: number, spread: number, size: number, opacity: number) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = (Math.random() - 0.7) * 400;
        pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0xffffff, size, sizeAttenuation: true, transparent: true, opacity,
    }));
}

function updateCamera(THREE: any, camera: any, state: any) {
    const { target, azimuth, elevation, distance } = state;
    camera.position.set(
        target.x + distance * Math.cos(elevation) * Math.sin(azimuth),
        distance * Math.sin(elevation),
        target.z + distance * Math.cos(elevation) * Math.cos(azimuth),
    );
    camera.lookAt(target);
}

// ── Popup ─────────────────────────────────────────────────────────────────────

function SectorPopup({
                         sector, sx, sy, onClose, onNavigate,
                     }: {
    sector: PlacedSector; sx: number; sy: number;
    onClose: () => void; onNavigate: () => void;
}) {
    const { hue } = sector;
    return (
        <div
            className="absolute z-20 w-64 rounded-xl bg-card border border-border shadow-2xl overflow-hidden pointer-events-auto"
            style={{ left: sx, top: sy, transform: 'translate(-50%, calc(-100% - 12px))' }}
        >
            <div
                className="px-4 py-3 flex items-center gap-3 border-b"
                style={{ background: `hsl(${hue},28%,11%)`, borderColor: `hsl(${hue},45%,20%)` }}
            >
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden"
                    style={{ background: `hsl(${hue},55%,28%)`, color: `hsl(${hue},80%,80%)` }}
                >
                    {sector.icon
                        ? <img src={sector.icon} alt="" className="w-full h-full object-cover" />
                        : sector.name[0].toUpperCase()
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{sector.name}</p>
                    <p className="text-xs font-mono" style={{ color: `hsl(${hue},60%,60%)` }}>s/{sector.slug}</p>
                </div>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition p-1 rounded">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="px-4 py-3 space-y-3">
                {sector.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{sector.description}</p>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{sector.member_count.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Video className="w-3 h-3" />{sector.video_count.toLocaleString()}</span>
                </div>
                <button
                    onClick={onNavigate}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
                    style={{
                        background: `hsl(${hue},55%,22%)`,
                        color: `hsl(${hue},80%,80%)`,
                        border: `1px solid hsl(${hue},45%,28%)`,
                    }}
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Visit s/{sector.slug}
                </button>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StarMapPage() {
    const mountRef  = useRef<HTMLDivElement>(null);
    const router    = useRouter();
    const supabase  = useRef(createSupabaseBrowserClient()).current;

    const [rawSectors, setRawSectors] = useState<SectorData[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [popup, setPopup] = useState<{ sector: PlacedSector; sx: number; sy: number } | null>(null);

    // Zoom state — written from the component, read from the animation loop
    const zoomStateRef = useRef<{ sector: PlacedSector; cb: () => void } | null>(null);

    // Fetch
    useEffect(() => {
        supabase
            .from('sectors')
            .select('id, slug, name, description, icon, member_count, video_count, galaxy_x, galaxy_y')
            .eq('star_map', true)
            .then(({ data }) => {
                setRawSectors((data ?? []) as SectorData[]);
                setLoading(false);
            });
    }, []);

    // Three.js scene
    useEffect(() => {
        if (loading || !mountRef.current) return;

        let cancelled = false;
        let disposeScene = () => {};

        async function init() {
            const THREE = await import('three');
            if (cancelled || !mountRef.current) return;

            const el = mountRef.current;
            const w  = el.clientWidth;
            const h  = el.clientHeight;

            // Renderer
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(w, h);
            renderer.setClearColor(0x020203, 1);
            el.appendChild(renderer.domElement);

            const scene = new THREE.Scene();

            // Camera
            const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 80000);
            const camState = {
                target:    new THREE.Vector3(0, 0, 0),
                azimuth:   0,
                elevation: 0.58,
                distance:  900,
            };
            updateCamera(THREE, camera, camState);

            // ── Stars ──────────────────────────────────────────────────────────────
            // Far layer: follows camera (infinite feel)
            const farStars = makeStarPoints(THREE, 5000, 24000, 1.5, 0.45);
            scene.add(farStars);
            // Mid layer: world-space (natural parallax)
            scene.add(makeStarPoints(THREE, 2000, 14000, 2.4, 0.65));
            // Near layer: bright, sparse
            scene.add(makeStarPoints(THREE, 500,  6000,  4.2, 0.90));

            // ── Process sectors ────────────────────────────────────────────────────
            const placed = resolveOverlaps(
                rawSectors.map(s => ({
                    ...s,
                    wx:     s.galaxy_x * COORD_SCALE,
                    wz:     s.galaxy_y * COORD_SCALE,
                    radius: computeRadius(s.member_count),
                    hue:    slugToHue(s.slug),
                    seed:   slugToSeed(s.slug),
                }))
            );

            // ── Build meshes ───────────────────────────────────────────────────────
            const sectorMeshes: any[]          = [];
            const meshToSector = new Map<string, PlacedSector>();
            const labelData: { sprite: any; sector: PlacedSector }[] = [];

            placed.forEach(s => {
                const color    = new THREE.Color().setHSL(s.hue / 360, 0.7, 0.42);
                const hlColor  = new THREE.Color().setHSL(s.hue / 360, 0.9, 0.62);

                // Glow (outer, additive)
                const glowShape = buildBlobShape(THREE, s.radius * 1.3, s.seed + 1);
                const glowMesh  = new THREE.Mesh(
                    new THREE.ShapeGeometry(glowShape),
                    new THREE.MeshBasicMaterial({
                        color, transparent: true, opacity: 0.10,
                        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
                    })
                );
                glowMesh.rotation.x = -Math.PI / 2;
                glowMesh.position.set(s.wx, -1, s.wz);
                scene.add(glowMesh);

                // Fill
                const fillShape = buildBlobShape(THREE, s.radius, s.seed);
                const fillMesh  = new THREE.Mesh(
                    new THREE.ShapeGeometry(fillShape),
                    new THREE.MeshBasicMaterial({
                        color, transparent: true, opacity: 0.26,
                        side: THREE.DoubleSide, depthWrite: false,
                    })
                );
                fillMesh.rotation.x = -Math.PI / 2;
                fillMesh.position.set(s.wx, 0, s.wz);
                scene.add(fillMesh);
                sectorMeshes.push(fillMesh);
                meshToSector.set(fillMesh.uuid, s);

                // Border line
                const edgePts = fillShape.getPoints(80);
                const lineGeo = new THREE.BufferGeometry().setFromPoints(
                    [...edgePts, edgePts[0]].map((p: any) => new THREE.Vector3(p.x, 0, p.y))
                );
                const border = new THREE.Line(
                    lineGeo,
                    new THREE.LineBasicMaterial({ color: hlColor, transparent: true, opacity: 0.75 })
                );
                border.position.set(s.wx, 0.5, s.wz);
                scene.add(border);

                // Label sprite
                const label = makeLabelSprite(THREE, s.name, s.hue);
                label.position.set(s.wx, 22, s.wz);
                scene.add(label);
                labelData.push({ sprite: label, sector: s });
            });

            // ── Animation loop ─────────────────────────────────────────────────────
            let animId: number;

            function animate() {
                animId = requestAnimationFrame(animate);

                // Far stars follow camera so they feel infinite
                farStars.position.x = camState.target.x;
                farStars.position.z = camState.target.z;

                // Labels: constant screen size + distance-based visibility
                // k drives apparent size; aspect ratio matches canvas (512 wide : 100 tall)
                const k = 0.075;
                labelData.forEach(({ sprite, sector }) => {
                    const d = camState.distance;
                    // Larger sectors stay visible from further away
                    const threshold = 300 + sector.radius * 14;
                    sprite.visible = d < threshold;
                    if (sprite.visible) {
                        sprite.scale.set(k * d * (512 / 100), k * d, 1);
                    }
                });

                // Zoom animation
                const zs = zoomStateRef.current;
                if (zs) {
                    camState.target.x += (zs.sector.wx - camState.target.x) * 0.07;
                    camState.target.z += (zs.sector.wz - camState.target.z) * 0.07;
                    camState.distance  += (90 - camState.distance) * 0.06;
                    updateCamera(THREE, camera, camState);

                    if (
                        Math.abs(camState.target.x - zs.sector.wx) < 2 &&
                        Math.abs(camState.target.z - zs.sector.wz) < 2 &&
                        Math.abs(camState.distance - 90) < 4
                    ) {
                        zoomStateRef.current = null;
                        zs.cb();
                    }
                }

                renderer.render(scene, camera);
            }
            animate();

            // ── Pointer controls ───────────────────────────────────────────────────
            let drag: { button: number; startX: number; startY: number; lastX: number; lastY: number; moved: boolean } | null = null;
            const cv = renderer.domElement;

            cv.addEventListener('contextmenu', (e: Event) => e.preventDefault());

            cv.addEventListener('pointerdown', (e: PointerEvent) => {
                cv.setPointerCapture(e.pointerId);
                drag = { button: e.button, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
            });

            const onMove = (e: PointerEvent) => {
                if (!drag || zoomStateRef.current) return;
                const dx = e.clientX - drag.lastX;
                const dy = e.clientY - drag.lastY;
                if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 4) drag.moved = true;

                if (drag.button === 0) {
                    // Pan in XZ plane aligned to camera azimuth.
                    // Camera right in XZ  = ( cos az,  0, -sin az )
                    // Camera forward in XZ = ( -sin az, 0, -cos az )
                    // Grab-drag: target moves opposite to camera motion so world follows cursor.
                    const spd   = camState.distance * 0.0013;
                    const sinAz = Math.sin(camState.azimuth);
                    const cosAz = Math.cos(camState.azimuth);
                    camState.target.x -= ( dx * cosAz + dy * sinAz) * spd;
                    camState.target.z -= (-dx * sinAz + dy * cosAz) * spd;
                } else {
                    // Rotate + pitch
                    camState.azimuth   -= dx * 0.006;
                    camState.elevation  = Math.max(ELEVATION_MIN, Math.min(ELEVATION_MAX, camState.elevation - dy * 0.005));
                }
                drag.lastX = e.clientX;
                drag.lastY = e.clientY;
                updateCamera(THREE, camera, camState);
            };

            const onUp = (e: PointerEvent) => {
                if (!drag) return;
                if (!drag.moved && drag.button === 0) {
                    // Click: raycast
                    const rect  = cv.getBoundingClientRect();
                    const ndc   = new THREE.Vector2(
                        ((e.clientX - rect.left) / rect.width)  * 2 - 1,
                        -((e.clientY - rect.top)  / rect.height) * 2 + 1,
                    );
                    const ray = new THREE.Raycaster();
                    ray.setFromCamera(ndc, camera);
                    const hits = ray.intersectObjects(sectorMeshes);
                    if (hits.length > 0) {
                        const s = meshToSector.get(hits[0].object.uuid)!;
                        setPopup({
                            sector: s,
                            sx: e.clientX - el.getBoundingClientRect().left,
                            sy: e.clientY - el.getBoundingClientRect().top,
                        });
                    } else {
                        setPopup(null);
                    }
                }
                drag = null;
            };

            const onWheel = (e: WheelEvent) => {
                e.preventDefault();
                if (zoomStateRef.current) return;
                camState.distance = Math.max(DIST_MIN, Math.min(DIST_MAX, camState.distance * (1 + e.deltaY * 0.001)));
                updateCamera(THREE, camera, camState);
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup',   onUp);
            cv.addEventListener('wheel', onWheel, { passive: false });

            // ── Resize ────────────────────────────────────────────────────────────
            const onResize = () => {
                const nw = el.clientWidth, nh = el.clientHeight;
                camera.aspect = nw / nh;
                camera.updateProjectionMatrix();
                renderer.setSize(nw, nh);
            };
            window.addEventListener('resize', onResize);

            // ── Dispose ───────────────────────────────────────────────────────────
            disposeScene = () => {
                cancelAnimationFrame(animId);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup',   onUp);
                window.removeEventListener('resize',      onResize);
                renderer.dispose();
                if (el.contains(cv)) el.removeChild(cv);
            };
        }

        init();

        return () => {
            cancelled = true;
            disposeScene();
        };
    }, [loading, rawSectors]);

    function zoomAndNavigate(sector: PlacedSector) {
        zoomStateRef.current = { sector, cb: () => router.push(`/s/${sector.slug}`) };
        setPopup(null);
    }

    return (
        // fixed, below the 64px TopBar, full bleed
        <div ref={mountRef} className="fixed inset-0 overflow-hidden" style={{ top: 64 }}>
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#020203]">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground tracking-wide">Loading Star Map…</p>
                </div>
            )}

            {/* Controls hint */}
            {!loading && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-xs text-white/50 pointer-events-none select-none">
                    <span>Left drag — pan</span>
                    <span className="text-white/20">·</span>
                    <span>Right drag — rotate</span>
                    <span className="text-white/20">·</span>
                    <span>Scroll — zoom</span>
                    <span className="text-white/20">·</span>
                    <span>Click sector — details</span>
                </div>
            )}

            {popup && (
                <SectorPopup
                    sector={popup.sector}
                    sx={popup.sx}
                    sy={popup.sy}
                    onClose={() => setPopup(null)}
                    onNavigate={() => zoomAndNavigate(popup.sector)}
                />
            )}
        </div>
    );
}
