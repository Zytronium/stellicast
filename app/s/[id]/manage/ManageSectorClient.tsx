'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import { AlertCircle, Trash2, Plus, Upload, Loader2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PickedCoords } from '@/components/StarMapCore';
import StarMapPicker from '@/components/StarMapPicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sector {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    star_map: boolean;
    private_access: boolean;
    open_posting: boolean;
    approval_for_posting: boolean;
    allow_ai: boolean;
    min_video_length: number;
    max_video_length: number;
    rules: string[];
    galaxy_x: number | null;
    galaxy_y: number | null;
    member_count: number;
    video_count: number;
}

interface Props {
    sector: Sector;
    memberRole: 'owner' | 'moderator';
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
    return (
        <div className="flex flex-col gap-0.5 mb-1.5">
            <label className="text-sm font-semibold text-foreground">{children}</label>
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <div className="flex items-center gap-1.5 mt-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-destructive-foreground flex-shrink-0" />
            <span className="text-xs text-destructive-foreground">{message}</span>
        </div>
    );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-4 p-5 rounded-xl bg-card border border-border">
            <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{title}</h3>
            {children}
        </div>
    );
}

function Checkbox({ label, hint, checked, onChange, disabled }: {
    label: string; hint?: string; checked: boolean;
    onChange: (v: boolean) => void; disabled?: boolean;
}) {
    return (
        <label className={`flex items-start gap-3 ${disabled ? 'opacity-50' : 'cursor-pointer group'}`}>
            <div className="mt-0.5 relative flex-shrink-0">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => !disabled && onChange(e.target.checked)}
                    disabled={disabled}
                    className="sr-only"
                />
                <div className={`w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center
                    ${checked ? 'bg-primary border-primary' : 'bg-input border-border group-hover:border-muted-foreground'}`}>
                    {checked && (
                        <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-foreground">{label}</span>
                {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
            </div>
        </label>
    );
}

function parseMinSec(value: string): number {
    const [m, s] = value.split(':').map(Number);
    return (m || 0) * 60 + (s || 0);
}

function parseHourMinSec(value: string): number {
    const [h, m, s] = value.split(':').map(Number);
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

function formatMinSec(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatHourMinSec(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function TimeInput({ label, hint, value, format, min, max, onChange, error }: {
    label: string; hint?: string; value: number; format: 'mm:ss' | 'hh:mm:ss';
    min: number; max: number; onChange: (seconds: number) => void; error?: string;
}) {
    const [raw, setRaw] = useState(format === 'mm:ss' ? formatMinSec(value) : formatHourMinSec(value));

    function handleBlur() {
        const parsed = format === 'mm:ss' ? parseMinSec(raw) : parseHourMinSec(raw);
        if (!isNaN(parsed)) {
            const clamped = Math.min(max, Math.max(min, parsed));
            onChange(clamped);
            setRaw(format === 'mm:ss' ? formatMinSec(clamped) : formatHourMinSec(clamped));
        }
    }

    return (
        <div>
            <FieldLabel hint={hint}>{label}</FieldLabel>
            <input
                type="text"
                value={raw}
                onChange={e => setRaw(e.target.value)}
                onBlur={handleBlur}
                placeholder={format === 'mm:ss' ? '00:00' : '00:00:00'}
                className={`w-full px-3 py-2 rounded-lg bg-input border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition font-mono
                    ${error ? 'border-destructive' : 'border-border'}`}
            />
            <FieldError message={error} />
        </div>
    );
}

function SaveButton({ saving, label = 'Save changes' }: { saving: boolean; label?: string }) {
    return (
        <button
            type="button"
            disabled={saving}
            className="flex items-center gap-2 h-9 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50"
        >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : label}
        </button>
    );
}

function StatusMessage({ error, success }: { error?: string; success?: string }) {
    if (error) return (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive-foreground text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
    );
    if (success) return (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
            {success}
        </div>
    );
    return null;
}

// ─── Tab components ───────────────────────────────────────────────────────────

function GeneralTab({ sector, supabase }: { sector: Sector; supabase: SupabaseClient }) {
    const fileRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(sector.name);
    const [description, setDescription] = useState(sector.description ?? '');
    const [iconPreview, setIconPreview] = useState<string | null>(sector.icon);
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconCleared, setIconCleared] = useState(false);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [nameError, setNameError] = useState('');

    function handleNameChange(v: string) {
        setName(v.slice(0, 32));
        setNameError('');
    }

    function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setError('Icon must be under 5 MB.'); return; }
        const reader = new FileReader();
        reader.onload = ev => {
            if (typeof ev.target?.result === 'string') {
                setIconPreview(ev.target.result);
                setIconFile(file);
                setIconCleared(false);
            }
        };
        reader.readAsDataURL(file);
    }

    function handleIconRemove() {
        setIconPreview(null);
        setIconFile(null);
        setIconCleared(true);
    }

    async function handleSave() {
        setError('');
        setSuccess('');

        if (!name.trim()) { setNameError('Name is required.'); return; }
        if (name.toLowerCase() === 'all') { setNameError('"All" is a reserved name.'); return; }

        setSaving(true);
        try {
            // Upload new icon if changed
            let iconUrl: string | null = iconCleared ? null : sector.icon;
            if (iconFile) {
                const ext = iconFile.name.split('.').pop();
                const filePath = `sectors/icon-${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage.from('sector-images').upload(filePath, iconFile);
                if (uploadError) throw new Error(`Icon upload failed: ${uploadError.message}`);
                const { data: { publicUrl } } = supabase.storage.from('sector-images').getPublicUrl(filePath);
                iconUrl = publicUrl;
            }

            // slug is intentionally excluded from the update payload — it is immutable
            const { error: updateError } = await supabase
                .from('sectors')
                .update({ name: name.trim(), description: description.trim() || null, icon: iconUrl, updated_at: new Date().toISOString() })
                .eq('id', sector.id);

            if (updateError) {
                if (updateError.message.includes('duplicate key') && updateError.message.includes('name'))
                    setNameError('A sector with this name already exists.');
                else
                    throw updateError;
                return;
            }

            setSuccess('General settings saved.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-2xl flex flex-col gap-6">
            <SectionCard title="Identity">
                {/* Icon */}
                <div>
                    <FieldLabel hint="Optional · Max 5 MB · Square images work best">Sector Icon</FieldLabel>
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-border hover:border-primary/50 transition flex items-center justify-center overflow-hidden flex-shrink-0"
                        >
                            {iconPreview ? (
                                <Image src={iconPreview} alt="Icon preview" width={64} height={64} className="object-cover w-full h-full" />
                            ) : (
                                <Upload className="w-5 h-5 text-muted-foreground" />
                            )}
                        </button>
                        <div className="flex flex-col gap-1">
                            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-primary hover:underline text-left">
                                {iconPreview ? 'Change icon' : 'Upload icon'}
                            </button>
                            {iconPreview && (
                                <button type="button" onClick={handleIconRemove} className="text-xs text-muted-foreground hover:text-destructive-foreground transition text-left">
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
                </div>

                {/* Name */}
                <div>
                    <FieldLabel hint={`${name.length}/32 characters`}>Sector Name</FieldLabel>
                    <input
                        type="text"
                        value={name}
                        onChange={e => handleNameChange(e.target.value)}
                        maxLength={32}
                        className={`w-full px-3 py-2 rounded-lg bg-input border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition ${nameError ? 'border-destructive' : 'border-border'}`}
                    />
                    <FieldError message={nameError} />
                </div>

                {/* Slug — read-only, cannot be changed after creation */}
                <div>
                    <FieldLabel hint="Slugs are permanent and cannot be changed after creation">Sector Slug</FieldLabel>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">s/</span>
                        <input
                            type="text"
                            value={sector.slug}
                            readOnly
                            className="w-full pl-8 pr-3 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground font-mono cursor-not-allowed select-none"
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <FieldLabel>Description</FieldLabel>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={4}
                        placeholder="Tell people what this sector is about."
                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition resize-none"
                    />
                </div>
            </SectionCard>

            <StatusMessage error={error} success={success} />

            <div className="flex justify-end" onClick={handleSave}>
                <SaveButton saving={saving} />
            </div>
        </div>
    );
}

function SettingsTab({ sector, supabase }: { sector: Sector; supabase: SupabaseClient }) {
    const [starMap, setStarMap] = useState(sector.star_map);
    const [location, setLocation] = useState<PickedCoords | null>(
        sector.galaxy_x != null && sector.galaxy_y != null
            ? { galaxy_x: sector.galaxy_x, galaxy_y: sector.galaxy_y }
            : null
    );
    const [privateAccess, setPrivateAccess] = useState(sector.private_access);
    const [openPosting, setOpenPosting] = useState(sector.open_posting);
    const [approvalForPosting, setApprovalForPosting] = useState(sector.approval_for_posting);
    const [allowAI, setAllowAI] = useState(sector.allow_ai);
    const [minVideoLength, setMinVideoLength] = useState(sector.min_video_length);
    const [maxVideoLength, setMaxVideoLength] = useState(sector.max_video_length);
    const [minError, setMinError] = useState('');
    const [maxError, setMaxError] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const missingLocation = starMap && !location;

    function handleStarMapChange(v: boolean) {
        setStarMap(v);
        // If toggling off, don't wipe the picked location so it can be restored
        // if the user changes their mind before saving.
    }

    async function handleSave() {
        setError('');
        setSuccess('');

        if (missingLocation) {
            setError('Please select a star map location before saving.');
            return;
        }

        if (minVideoLength >= maxVideoLength) {
            setMinError('Min length must be less than max length.');
            setMaxError('Max length must be greater than min length.');
            return;
        }
        setMinError('');
        setMaxError('');

        setSaving(true);
        try {
            const patch: Record<string, unknown> = {
                star_map: starMap,
                private_access: privateAccess,
                open_posting: openPosting,
                approval_for_posting: approvalForPosting,
                allow_ai: allowAI,
                min_video_length: minVideoLength,
                max_video_length: maxVideoLength,
                updated_at: new Date().toISOString(),
            };

            if (starMap && location) {
                patch.galaxy_x = location.galaxy_x;
                patch.galaxy_y = location.galaxy_y;
            } else if (!starMap) {
                // Removing from star map — free up the coordinates
                patch.galaxy_x = null;
                patch.galaxy_y = null;
            }

            const { error: updateError } = await supabase
                .from('sectors')
                .update(patch)
                .eq('id', sector.id);

            if (updateError) throw updateError;
            setSuccess('Settings saved.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-2xl flex flex-col gap-6">
            <SectionCard title="Privacy & Access">
                <Checkbox
                    label="Appear on Star Map"
                    hint="Allow this sector to be discovered by anyone browsing Stellicast. Disabling frees up its map coordinates."
                    checked={starMap}
                    onChange={handleStarMapChange}
                />
                {starMap && (
                    <div className="flex flex-col gap-3 pt-1">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-semibold text-foreground">Star Map Location</span>
                            <span className="text-xs text-muted-foreground">
                                Click an empty spot on the map to choose where your sector appears.
                                {!location && <span className="text-destructive-foreground font-medium"> A location is required.</span>}
                            </span>
                        </div>
                        <StarMapPicker
                            value={location}
                            onChange={setLocation}
                            previewName={sector.name}
                            height={480}
                        />
                        {location && (
                            <button
                                type="button"
                                onClick={() => setLocation(null)}
                                className="self-start text-xs text-muted-foreground hover:text-destructive-foreground transition"
                            >
                                Clear location
                            </button>
                        )}
                    </div>
                )}
                <Checkbox
                    label="Private Access"
                    hint="Only approved members can join and view content."
                    checked={privateAccess}
                    onChange={setPrivateAccess}
                />
                <Checkbox
                    label="Open Posting"
                    hint="Allow anyone to post videos, not just members."
                    checked={openPosting}
                    onChange={setOpenPosting}
                />
                <Checkbox
                    label="Require Approval for Posting"
                    hint="All posts not made by mods must be approved before going public."
                    checked={approvalForPosting}
                    onChange={setApprovalForPosting}
                />
            </SectionCard>

            <SectionCard title="Content Rules">
                <Checkbox
                    label="Allow AI Content"
                    hint="Permit videos generated by or with AI tools."
                    checked={allowAI}
                    onChange={setAllowAI}
                />
                <TimeInput
                    label="Min Video Length"
                    hint="Shortest video allowed (mm:ss)"
                    value={minVideoLength}
                    format="mm:ss"
                    min={0}
                    max={3600}
                    error={minError}
                    onChange={v => { setMinVideoLength(v); setMinError(''); }}
                />
                <TimeInput
                    label="Max Video Length"
                    hint="Longest video allowed (hh:mm:ss)"
                    value={maxVideoLength}
                    format="hh:mm:ss"
                    min={15}
                    max={43200}
                    error={maxError}
                    onChange={v => { setMaxVideoLength(v); setMaxError(''); }}
                />
            </SectionCard>

            <StatusMessage error={error} success={success} />

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || missingLocation}
                    title={missingLocation ? 'Select a star map location first' : undefined}
                    className="flex items-center gap-2 h-9 px-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save changes'}
                </button>
            </div>
        </div>
    );
}

function RulesTab({ sector, supabase }: { sector: Sector; supabase: SupabaseClient }) {
    const [rules, setRules] = useState<string[]>(sector.rules ?? []);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    function updateRule(i: number, value: string) {
        const next = [...rules];
        next[i] = value;
        setRules(next);
    }

    function removeRule(i: number) { setRules(rules.filter((_, idx) => idx !== i)); }
    function addRule() { if (rules.length < 20) setRules([...rules, '']); }

    async function handleSave() {
        setError('');
        setSuccess('');
        setSaving(true);
        try {
            const cleaned = rules.map(r => r.trim()).filter(Boolean);
            const { error: updateError } = await supabase
                .from('sectors')
                .update({ rules: cleaned, updated_at: new Date().toISOString() })
                .eq('id', sector.id);
            if (updateError) throw updateError;
            setRules(cleaned);
            setSuccess('Rules saved.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="max-w-2xl flex flex-col gap-6">
            <SectionCard title={`Sector Rules · ${rules.length}/20`}>
                <p className="text-xs text-muted-foreground -mt-2">
                    Rules are shown publicly and help moderators make consistent decisions.
                </p>
                <div className="flex flex-col gap-2">
                    {rules.map((rule, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}.</span>
                            <input
                                type="text"
                                value={rule}
                                onChange={e => updateRule(i, e.target.value)}
                                placeholder={`Rule ${i + 1}`}
                                className="flex-1 px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition"
                            />
                            <button
                                type="button"
                                onClick={() => removeRule(i)}
                                className="text-muted-foreground hover:text-destructive-foreground transition p-1 rounded"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {rules.length < 20 && (
                        <button type="button" onClick={addRule} className="flex items-center gap-2 text-xs text-primary hover:underline mt-1 self-start">
                            <Plus className="w-3.5 h-3.5" /> Add rule
                        </button>
                    )}
                </div>
            </SectionCard>

            <StatusMessage error={error} success={success} />

            <div className="flex justify-end" onClick={handleSave}>
                <SaveButton saving={saving} />
            </div>
        </div>
    );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

const TABS = ['general', 'settings', 'rules'] as const;
type Tab = typeof TABS[number];

export default function ManageSectorClient({ sector, memberRole }: Props) {
    const supabase = createSupabaseBrowserClient();
    const [activeTab, setActiveTab] = useState<Tab>('general');

    return (
        <div className="flex flex-col gap-8 py-6 animate-[fade-in-up_0.5s_ease-out_forwards]">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border flex-shrink-0">
                        {sector.icon ? (
                            <Image src={sector.icon} alt={sector.name} width={56} height={56} className="object-cover w-full h-full" />
                        ) : (
                            <span className="text-xl font-bold text-muted-foreground">{sector.name[0].toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">{sector.name}</h1>
                        <p className="text-xs text-muted-foreground font-mono">s/{sector.slug} · {memberRole}</p>
                    </div>
                </div>
                <Link
                    href={`/s/${sector.slug}`}
                    className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                    View Sector
                </Link>
            </div>

            <hr className="border-border -mt-4" />

            {/* Tabs */}
            <div className="flex flex-row gap-6 -mb-6">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`relative pb-2 text-sm transition-all ${
                            activeTab === tab
                                ? 'font-bold text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary'
                                : 'font-thin text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
            <hr className="border-border" />

            {/* Tab panels */}
            <div className={activeTab === 'general' ? 'block' : 'hidden'}>
                <GeneralTab sector={sector} supabase={supabase} />
            </div>
            <div className={activeTab === 'settings' ? 'block' : 'hidden'}>
                <SettingsTab sector={sector} supabase={supabase} />
            </div>
            <div className={activeTab === 'rules' ? 'block' : 'hidden'}>
                <RulesTab sector={sector} supabase={supabase} />
            </div>
        </div>
    );
}
