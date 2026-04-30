'use client';

import { useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import { Users, Video, ExternalLink, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SectorData {
    id: string; slug: string; name: string; description: string | null;
    icon: string | null; member_count: number; video_count: number;
    galaxy_x: number; galaxy_y: number;
}
interface PlacedSector extends SectorData {
    wx: number; wz: number; radius: number; hue: number; seed: number;
}

export interface PickedCoords { galaxy_x: number; galaxy_y: number; }

export interface StarMapCoreProps {
    /**
     * 'view'  — original full-map behaviour (popups, zoom-to-sector).
     * 'pick'  — location picker; clicking empty space outputs coordinates.
     */
    mode?: 'view' | 'pick';
    /** view mode: called with sector slug when user navigates (e.g. router.push(`/s/${slug}`)) */
    onNavigate?: (slug: string) => void;
    /** pick mode: called with galaxy_x/galaxy_y when user places a location */
    onPick?: (coords: PickedCoords | null) => void;
    /** pick mode: controlled value — drives the preview blob position */
    pickedCoords?: PickedCoords | null;
    /**
     * pick mode: label shown on the preview blob.
     * NOTE: this is baked into the canvas texture at scene-init time.
     * For live updates, remount the component (add a `key` prop).
     */
    previewName?: string;
    /** Tailwind/CSS classes applied to the root div — controls size & position. */
    className?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COORD_SCALE    = 250;
const MIN_RADIUS     = 30;
const MAX_RADIUS     = 180;
const MIN_GAP        = 100;
const ELEVATION_MIN  = 0.18;
const ELEVATION_MAX  = 1.20;
const DIST_MIN       = 80;
const DIST_MAX       = 6000;
const PREVIEW_HUE    = 220;   // steel-blue for the "pending" preview blob
const PREVIEW_RADIUS = MIN_RADIUS;
const PREVIEW_SEED   = 42;

// ── Pure helpers ──────────────────────────────────────────────────────────────

function lcg(s: number) {
    let n = s | 0;
    return () => { n = Math.imul(1664525, n) + 1013904223 | 0; return (n >>> 0) / 0xFFFFFFFF; };
}
function computeRadius(members: number, maxMembers: number) {
    return MIN_RADIUS + Math.min(members, maxMembers) / maxMembers * (MAX_RADIUS - MIN_RADIUS);
}
function slugToHue(slug: string) {
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffff;
    // MurmurHash3-style finalizer — avalanche the bits before taking modulo
    h ^= h >>> 8;
    h  = Math.imul(h, 0x9e3779b9);
    h ^= h >>> 7;
    h  = Math.imul(h, 0xa37bcf31);
    h ^= h >>> 6;
    return (h >>> 0) % 360;
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
                const dx = out[j].wx - out[i].wx, dz = out[j].wz - out[i].wz;
                const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
                const minDist = out[i].radius + out[j].radius + MIN_GAP;
                if (dist < minDist) {
                    const push = (minDist - dist) / 2, nx = dx / dist, nz = dz / dist;
                    out[i].wx -= nx * push; out[i].wz -= nz * push;
                    out[j].wx += nx * push; out[j].wz += nz * push;
                    moved = true;
                }
            }
        }
        if (!moved) break;
    }
    return out;
}

// ── Three.js helpers ──────────────────────────────────────────────────────────

function buildBlobShape(THREE: any, radius: number, seed: number, numPts = 10) {
    const rng  = lcg(seed);
    const step = (Math.PI * 2) / numPts;
    const angles = Array.from({ length: numPts }, (_, i) => i * step + (rng() - 0.5) * step * 0.45);
    const radii  = angles.map(() => radius * (0.62 + rng() * 0.76));
    const pts    = angles.map((a, i) => ({ x: radii[i] * Math.cos(a), y: radii[i] * Math.sin(a) }));
    const n      = pts.length;
    const shape  = new THREE.Shape();
    shape.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        shape.bezierCurveTo(
            p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
            p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
            p2.x, p2.y,
        );
    }
    shape.closePath();
    return shape;
}

function makeLabelSprite(THREE: any, text: string, hue: number) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 100;
    const ctx = cv.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 100);
    ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 14;
    ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = `hsl(${hue},80%,88%)`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 50);
    const tex = new THREE.CanvasTexture(cv);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
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

// ── SectorPopup (view mode) ───────────────────────────────────────────────────

function SectorPopup({ sector, sx, sy, onClose, onNavigate }: {
    sector: PlacedSector; sx: number; sy: number;
    onClose: () => void; onNavigate: () => void;
}) {
    const { hue } = sector;
    return (
        <div
            className="absolute z-20 w-64 rounded-xl bg-card border border-border shadow-2xl overflow-hidden pointer-events-auto"
            style={{ left: sx, top: sy, transform: 'translate(-50%, calc(-100% - 12px))' }}
        >
            <div className="px-4 py-3 flex items-center gap-3 border-b"
                 style={{ background: `hsl(${hue},28%,11%)`, borderColor: `hsl(${hue},45%,20%)` }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden"
                     style={{ background: `hsl(${hue},55%,28%)`, color: `hsl(${hue},80%,80%)` }}>
                    {sector.icon
                        ? <img src={sector.icon} alt="" className="w-full h-full object-cover" />
                        : sector.name[0].toUpperCase()}
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
                <button onClick={onNavigate}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
                        style={{ background: `hsl(${hue},55%,22%)`, color: `hsl(${hue},80%,80%)`, border: `1px solid hsl(${hue},45%,28%)` }}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    Visit s/{sector.slug}
                </button>
            </div>
        </div>
    );
}

// ── StarMapCore ───────────────────────────────────────────────────────────────

export default function StarMapCore({
                                        mode        = 'view',
                                        onNavigate,
                                        onPick,
                                        pickedCoords,
                                        previewName = 'New Sector',
                                        className   = 'relative w-full h-full',
                                    }: StarMapCoreProps) {
    const mountRef = useRef<HTMLDivElement>(null);
    const supabase = useRef(createSupabaseBrowserClient()).current;

    const [rawSectors, setRawSectors] = useState<SectorData[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [popup,      setPopup]      = useState<{ sector: PlacedSector; sx: number; sy: number } | null>(null);
    const [isMobile,   setIsMobile]   = useState(false);
    const [tooClose,   setTooClose]   = useState(false);

    // Stable callback refs — lets handlers always call the latest prop without
    // the Three.js useEffect needing to re-run on every render.
    const onPickRef     = useRef(onPick);
    const onNavigateRef = useRef(onNavigate);
    useEffect(() => { onPickRef.current     = onPick;     }, [onPick]);
    useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);

    // Internal scene refs
    const zoomStateRef    = useRef<{ sector: PlacedSector; cb: () => void } | null>(null);
    const placedRef       = useRef<PlacedSector[]>([]);
    const previewGroupRef = useRef<any>(null);  // THREE.Group
    const previewMatsRef  = useRef<{ fill: any; glow: any } | null>(null); // for pulsing

    // Detect touch device
    useEffect(() => {
        setIsMobile(navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches);
    }, []);

    // Keep the Three.js preview group in sync with the controlled pickedCoords prop
    useEffect(() => {
        const grp = previewGroupRef.current;
        if (!grp) return;
        if (pickedCoords) {
            grp.position.set(pickedCoords.galaxy_x * COORD_SCALE, 0, pickedCoords.galaxy_y * COORD_SCALE);
            grp.visible = true;
        } else {
            grp.visible = false;
        }
    }, [pickedCoords]);

    // Fetch sectors
    useEffect(() => {
        supabase
            .from('sectors')
            .select('id,slug,name,description,icon,member_count,video_count,galaxy_x,galaxy_y')
            .eq('star_map', true)
            .then(({ data }: { data: SectorData[] | null }) => {
                setRawSectors((data ?? []) as SectorData[]);
                setLoading(false);
            });
    }, []);

    // Three.js scene
    useEffect(() => {
        if (loading || !mountRef.current) return;
        let cancelled   = false;
        let disposeScene = () => {};

        async function init() {
            const THREE = await import('three');
            if (cancelled || !mountRef.current) return;

            const el = mountRef.current;
            const w  = el.clientWidth, h = el.clientHeight;

            // ── Renderer ──────────────────────────────────────────────────────
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(w, h);
            renderer.setClearColor(0x020203, 1);
            el.appendChild(renderer.domElement);

            const scene  = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 80000);
            const camState = { target: new THREE.Vector3(0, 0, 0), azimuth: 0, elevation: 0.58, distance: 900 };
            updateCamera(THREE, camera, camState);

            // ── Stars ─────────────────────────────────────────────────────────
            const farStars = makeStarPoints(THREE, 5000, 24000, 1.5, 0.45);
            scene.add(farStars);
            scene.add(makeStarPoints(THREE, 2000, 14000, 2.4, 0.65));
            scene.add(makeStarPoints(THREE, 500,  6000,  4.2, 0.90));

            // ── Sectors ───────────────────────────────────────────────────────
            const maxMembers = Math.max(5, ...rawSectors.map(s => s.member_count));
            const placed = resolveOverlaps(
                rawSectors.map(s => ({
                    ...s,
                    wx: s.galaxy_x * COORD_SCALE, wz: s.galaxy_y * COORD_SCALE,
                    radius: computeRadius(s.member_count, maxMembers),
                    hue:    slugToHue(s.slug),
                    seed:   slugToSeed(s.slug),
                }))
            );
            placedRef.current = placed;

            const sectorMeshes: any[]                  = [];
            const meshToSector = new Map<string, PlacedSector>();
            const labelData:    { sprite: any; sector: PlacedSector }[] = [];

            placed.forEach(s => {
                const color   = new THREE.Color().setHSL(s.hue / 360, 0.7, 0.42);
                const hlColor = new THREE.Color().setHSL(s.hue / 360, 0.9, 0.62);

                const glowShape = buildBlobShape(THREE, s.radius * 1.3, s.seed + 1);
                const glowMesh  = new THREE.Mesh(
                    new THREE.ShapeGeometry(glowShape),
                    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
                );
                glowMesh.rotation.x = -Math.PI / 2;
                glowMesh.position.set(s.wx, -1, s.wz);
                scene.add(glowMesh);

                const fillShape = buildBlobShape(THREE, s.radius, s.seed);
                const fillMesh  = new THREE.Mesh(
                    new THREE.ShapeGeometry(fillShape),
                    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false }),
                );
                fillMesh.rotation.x = -Math.PI / 2;
                fillMesh.position.set(s.wx, 0, s.wz);
                scene.add(fillMesh);
                sectorMeshes.push(fillMesh);
                meshToSector.set(fillMesh.uuid, s);

                const edgePts = fillShape.getPoints(80);
                const lineGeo = new THREE.BufferGeometry().setFromPoints(
                    [...edgePts, edgePts[0]].map((p: any) => new THREE.Vector3(p.x, 0, p.y))
                );
                const border  = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: hlColor, transparent: true, opacity: 0.75 }));
                border.position.set(s.wx, 0.5, s.wz);
                scene.add(border);

                const label = makeLabelSprite(THREE, s.name, s.hue);
                label.position.set(s.wx, 22, s.wz);
                scene.add(label);
                labelData.push({ sprite: label, sector: s });
            });

            // ── Preview sector (pick mode only) ───────────────────────────────
            if (mode === 'pick') {
                const pColor   = new THREE.Color().setHSL(PREVIEW_HUE / 360, 0.7, 0.50);
                const pHlColor = new THREE.Color().setHSL(PREVIEW_HUE / 360, 0.9, 0.75);

                const pGlowMat = new THREE.MeshBasicMaterial({ color: pColor, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
                const pFillMat = new THREE.MeshBasicMaterial({ color: pColor, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });

                const pGlow   = new THREE.Mesh(new THREE.ShapeGeometry(buildBlobShape(THREE, PREVIEW_RADIUS * 1.3, PREVIEW_SEED + 1)), pGlowMat);
                pGlow.rotation.x = -Math.PI / 2;
                pGlow.position.y = -1;

                const pFill   = new THREE.Mesh(new THREE.ShapeGeometry(buildBlobShape(THREE, PREVIEW_RADIUS, PREVIEW_SEED)), pFillMat);
                pFill.rotation.x = -Math.PI / 2;

                const pEdgePts = buildBlobShape(THREE, PREVIEW_RADIUS, PREVIEW_SEED).getPoints(80);
                const pBorder  = new THREE.Line(
                    new THREE.BufferGeometry().setFromPoints([...pEdgePts, pEdgePts[0]].map((p: any) => new THREE.Vector3(p.x, 0, p.y))),
                    new THREE.LineBasicMaterial({ color: pHlColor, transparent: true, opacity: 0.95 }),
                );
                pBorder.position.y = 0.5;

                const pLabel  = makeLabelSprite(THREE, previewName, PREVIEW_HUE);
                pLabel.position.y = 22;

                const pGroup  = new THREE.Group();
                pGroup.add(pGlow, pFill, pBorder, pLabel);
                pGroup.visible = false;

                // Apply controlled value if already set when scene mounts
                if (pickedCoords) {
                    pGroup.position.set(pickedCoords.galaxy_x * COORD_SCALE, 0, pickedCoords.galaxy_y * COORD_SCALE);
                    pGroup.visible = true;
                }

                scene.add(pGroup);
                previewGroupRef.current = pGroup;
                previewMatsRef.current  = { fill: pFillMat, glow: pGlowMat };
            }

            // Invisible ground plane — raycasting target for pick mode
            const groundPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(200000, 200000),
                new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
            );
            groundPlane.rotation.x = -Math.PI / 2;
            scene.add(groundPlane);

            // ── Animation loop ────────────────────────────────────────────────
            let animId: number;

            function animate() {
                animId = requestAnimationFrame(animate);

                farStars.position.x = camState.target.x;
                farStars.position.z = camState.target.z;

                const k = 0.075;
                labelData.forEach(({ sprite, sector: s }) => {
                    const visible = camState.distance < 300 + s.radius * 14;
                    sprite.visible = visible;
                    if (visible) sprite.scale.set(k * camState.distance * (512 / 100), k * camState.distance, 1);
                });

                // Pulse preview blob opacity & scale its label
                if (previewGroupRef.current?.visible && previewMatsRef.current) {
                    const pulse = 0.5 + 0.35 * Math.sin(performance.now() / 420);
                    previewMatsRef.current.fill.opacity = pulse * 0.45;
                    previewMatsRef.current.glow.opacity = pulse * 0.18;
                    // pLabel is the 4th child
                    const pLabel = previewGroupRef.current.children[3];
                    if (pLabel) {
                        pLabel.visible = camState.distance < 300 + PREVIEW_RADIUS * 14;
                        if (pLabel.visible) pLabel.scale.set(k * camState.distance * (512 / 100), k * camState.distance, 1);
                    }
                }

                // Zoom-to-sector animation (view mode)
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

            // ── Shared click handler ──────────────────────────────────────────
            function handleClick(clientX: number, clientY: number) {
                const rect = renderer.domElement.getBoundingClientRect();
                const ndc  = new THREE.Vector2(
                    ((clientX - rect.left) / rect.width)  *  2 - 1,
                    -((clientY - rect.top)  / rect.height) *  2 + 1,
                );
                const ray = new THREE.Raycaster();
                ray.setFromCamera(ndc, camera);

                if (mode === 'view') {
                    const hits = ray.intersectObjects(sectorMeshes);
                    if (hits.length > 0) {
                        setPopup({
                            sector: meshToSector.get(hits[0].object.uuid)!,
                            sx: clientX - el.getBoundingClientRect().left,
                            sy: clientY - el.getBoundingClientRect().top,
                        });
                    } else {
                        setPopup(null);
                    }
                    return;
                }

                // ── pick mode ─────────────────────────────────────────────────
                // Clicking on an existing sector counts as "too close"
                if (ray.intersectObjects(sectorMeshes).length > 0) {
                    setTooClose(true);
                    setTimeout(() => setTooClose(false), 2500);
                    return;
                }
                const groundHits = ray.intersectObject(groundPlane);
                if (groundHits.length === 0) return;

                const pt = groundHits[0].point;
                const isBlocked = placedRef.current.some(s => {
                    const dx = pt.x - s.wx, dz = pt.z - s.wz;
                    return Math.sqrt(dx * dx + dz * dz) < s.radius + PREVIEW_RADIUS + MIN_GAP;
                });

                if (isBlocked) {
                    setTooClose(true);
                    setTimeout(() => setTooClose(false), 2500);
                } else {
                    onPickRef.current?.({ galaxy_x: pt.x / COORD_SCALE, galaxy_y: pt.z / COORD_SCALE });
                }
            }

            // ── Pointer controls ──────────────────────────────────────────────
            let drag: { button: number; startX: number; startY: number; lastX: number; lastY: number; moved: boolean } | null = null;
            const cv = renderer.domElement;

            cv.addEventListener('contextmenu', (e: Event) => e.preventDefault());
            cv.addEventListener('pointerdown', (e: PointerEvent) => {
                cv.setPointerCapture(e.pointerId);
                drag = { button: e.button, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
            });

            const onMove = (e: PointerEvent) => {
                if (!drag || zoomStateRef.current) return;
                const dx = e.clientX - drag.lastX, dy = e.clientY - drag.lastY;
                if (Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY) > 4) drag.moved = true;
                if (drag.button === 0) {
                    const spd = camState.distance * 0.0013;
                    const sinAz = Math.sin(camState.azimuth), cosAz = Math.cos(camState.azimuth);
                    camState.target.x -= ( dx * cosAz + dy * sinAz) * spd;
                    camState.target.z -= (-dx * sinAz + dy * cosAz) * spd;
                } else {
                    camState.azimuth   -= dx * 0.006;
                    camState.elevation  = Math.max(ELEVATION_MIN, Math.min(ELEVATION_MAX, camState.elevation - dy * 0.005));
                }
                drag.lastX = e.clientX; drag.lastY = e.clientY;
                updateCamera(THREE, camera, camState);
            };

            const onUp = (e: PointerEvent) => {
                if (!drag) return;
                if (!drag.moved && drag.button === 0) handleClick(e.clientX, e.clientY);
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

            // ── Touch controls ────────────────────────────────────────────────
            let onTouchStart: ((e: TouchEvent) => void) | null = null;
            let onTouchMove:  ((e: TouchEvent) => void) | null = null;
            let onTouchEnd:   ((e: TouchEvent) => void) | null = null;

            if (navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches) {
                let lastPinchDist = 0, lastPinchMid = { x: 0, y: 0 };

                onTouchStart = (e: TouchEvent) => {
                    e.preventDefault();
                    lastPinchDist = 0;
                    if (e.touches.length === 1) {
                        const t = e.touches[0];
                        drag = { button: 0, startX: t.clientX, startY: t.clientY, lastX: t.clientX, lastY: t.clientY, moved: false };
                    } else { drag = null; }
                };

                onTouchMove = (e: TouchEvent) => {
                    e.preventDefault();
                    if (zoomStateRef.current) return;
                    if (e.touches.length === 1 && drag) {
                        const t = e.touches[0];
                        const dx = t.clientX - drag.lastX, dy = t.clientY - drag.lastY;
                        if (Math.abs(t.clientX - drag.startX) + Math.abs(t.clientY - drag.startY) > 4) drag.moved = true;
                        const spd = camState.distance * 0.0013;
                        const sinAz = Math.sin(camState.azimuth), cosAz = Math.cos(camState.azimuth);
                        camState.target.x -= ( dx * cosAz + dy * sinAz) * spd;
                        camState.target.z -= (-dx * sinAz + dy * cosAz) * spd;
                        drag.lastX = t.clientX; drag.lastY = t.clientY;
                        updateCamera(THREE, camera, camState);
                    } else if (e.touches.length === 2) {
                        drag = null;
                        const t1 = e.touches[0], t2 = e.touches[1];
                        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                        const midX = (t1.clientX + t2.clientX) / 2, midY = (t1.clientY + t2.clientY) / 2;
                        if (lastPinchDist > 0) {
                            camState.distance   = Math.max(DIST_MIN, Math.min(DIST_MAX, camState.distance * (lastPinchDist / dist)));
                            camState.azimuth   -= (midX - lastPinchMid.x) * 0.006;
                            camState.elevation  = Math.max(ELEVATION_MIN, Math.min(ELEVATION_MAX, camState.elevation - (midY - lastPinchMid.y) * 0.005));
                        }
                        lastPinchDist = dist; lastPinchMid = { x: midX, y: midY };
                        updateCamera(THREE, camera, camState);
                    }
                };

                onTouchEnd = (e: TouchEvent) => {
                    if (e.touches.length < 2) lastPinchDist = 0;
                    if (e.touches.length === 0) {
                        if (drag && !drag.moved) {
                            const t = e.changedTouches[0];
                            handleClick(t.clientX, t.clientY);
                        }
                        drag = null;
                    } else if (e.touches.length === 1) {
                        const t = e.touches[0];
                        drag = { button: 0, startX: t.clientX, startY: t.clientY, lastX: t.clientX, lastY: t.clientY, moved: false };
                    }
                };

                cv.addEventListener('touchstart', onTouchStart, { passive: false });
                cv.addEventListener('touchmove',  onTouchMove,  { passive: false });
                cv.addEventListener('touchend',   onTouchEnd,   { passive: false });
            }

            // ── Resize ────────────────────────────────────────────────────────
            const onResize = () => {
                const nw = el.clientWidth, nh = el.clientHeight;
                camera.aspect = nw / nh;
                camera.updateProjectionMatrix();
                renderer.setSize(nw, nh);
            };
            window.addEventListener('resize', onResize);

            // ── Dispose ───────────────────────────────────────────────────────
            disposeScene = () => {
                cancelAnimationFrame(animId);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup',   onUp);
                window.removeEventListener('resize',      onResize);
                if (onTouchStart) cv.removeEventListener('touchstart', onTouchStart);
                if (onTouchMove)  cv.removeEventListener('touchmove',  onTouchMove);
                if (onTouchEnd)   cv.removeEventListener('touchend',   onTouchEnd);
                previewGroupRef.current = null;
                previewMatsRef.current  = null;
                renderer.dispose();
                if (el.contains(cv)) el.removeChild(cv);
            };
        }

        init();
        return () => { cancelled = true; disposeScene(); };
    }, [loading, rawSectors, mode]); // `mode` is stable per mount; callbacks use refs

    function zoomAndNavigate(sector: PlacedSector) {
        zoomStateRef.current = { sector, cb: () => onNavigateRef.current?.(sector.slug) };
        setPopup(null);
    }

    return (
        <div ref={mountRef} className={className}>
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#020203]">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground tracking-wide">Loading Star Map…</p>
                </div>
            )}

            {/* Controls hint */}
            {!loading && (
                <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center mb-16 md:mb-0 ${isMobile ? 'flex-col items-start gap-0' : 'flex-row gap-4'} px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-xs text-white/50 pointer-events-none select-none`}>
                    {isMobile ? (
                        <>
                            <span>Drag — pan</span>
                            <span>Two fingers — rotate &amp; zoom</span>
                            <span>{mode === 'pick' ? 'Tap empty space — place here' : 'Tap sector — details'}</span>
                        </>
                    ) : (
                        <>
                            <span>Left drag — pan</span>
                            <span className="text-white/20">·</span>
                            <span>Right drag — rotate</span>
                            <span className="text-white/20">·</span>
                            <span>Scroll — zoom</span>
                            <span className="text-white/20">·</span>
                            <span>{mode === 'pick' ? 'Click empty space — place here' : 'Click sector — details'}</span>
                        </>
                    )}
                </div>
            )}

            {/* Pick mode: coordinates readout */}
            {mode === 'pick' && pickedCoords && (
                <div className="absolute top-3 right-3 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-xs font-mono text-white/70 pointer-events-none select-none space-y-0.5">
                    <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Location</div>
                    <div>x <span className="text-white/90">{pickedCoords.galaxy_x.toFixed(4)}</span></div>
                    <div>y <span className="text-white/90">{pickedCoords.galaxy_y.toFixed(4)}</span></div>
                </div>
            )}

            {/* Pick mode: too-close warning */}
            {mode === 'pick' && tooClose && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-red-950/80 border border-red-500/40 backdrop-blur-sm text-xs text-red-300 pointer-events-none select-none animate-in fade-in duration-150">
                    Too close to an existing sector
                </div>
            )}

            {/* View mode: sector popup */}
            {mode === 'view' && popup && (
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
