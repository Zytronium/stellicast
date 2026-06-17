'use client';

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {Plus, Compass, Hash, Trash2, Loader2, AlertCircle, Upload} from "lucide-react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/../lib/supabase-client";
import { PickedCoords } from "@/components/StarMapCore";
import StarMapPicker from "@/components/StarMapPicker";

// -------- Helpers --------

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 24);
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

// -------- Sub-components --------

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

function Checkbox({
                      label, hint, checked, onChange,
                  }: {
    label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5 relative flex-shrink-0">
                <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-4 p-5 rounded-xl bg-card border border-border">
            <h3 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">{title}</h3>
            {children}
        </div>
    );
}

function TimeInput({
                       label, hint, value, format, min, max, onChange, error,
                   }: {
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

// -------- Form State --------

interface FormState {
    starMap: boolean;
    privateAccess: boolean;
    open_posting: boolean;
    approval_for_posting: boolean;
    allowAI: boolean;
    minVideoLength: number;
    maxVideoLength: number;
    iconFile: File | null;
    iconPreview: string;
    name: string;
    slug: string;
    description: string;
    rules: string[];
}

interface FormErrors {
    name?: string;
    slug?: string;
    icon?: string;
    minVideoLength?: string;
    maxVideoLength?: string;
    submit?: string;
}

const defaultForm: FormState = {
    starMap: true,
    privateAccess: false,
    open_posting: true,
    approval_for_posting: false,
    allowAI: true,
    minVideoLength: 1,
    maxVideoLength: 28800,
    iconFile: null,
    iconPreview: '',
    name: '',
    slug: '',
    description: '',
    rules: [],
};

// -------- Column Components --------

function AdvancedOptionsColumn({
                                   form, setForm, errors, setErrors,
                               }: {
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
    errors: FormErrors;
    setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
}) {
    return (
        <div className="flex flex-col gap-4">
            <SectionCard title="Privacy & Access">
                <Checkbox
                    label="Appear on Star Map"
                    hint="Allow this Sector to be discovered by anyone browsing Stellicast."
                    checked={form.starMap}
                    onChange={v => setForm(f => ({ ...f, starMap: v }))}
                />
                <Checkbox
                    label="Private Access"
                    hint="Only approved members can join and view content."
                    checked={form.privateAccess}
                    onChange={v => setForm(f => ({ ...f, privateAccess: v }))}
                />
                <Checkbox
                    label="Open Posting"
                    hint="Allow anyone to post videos, not just members."
                    checked={form.open_posting}
                    onChange={v => setForm(f => ({ ...f, open_posting: v }))}
                />
                <Checkbox
                    label="Require Approval for Posting"
                    hint="All posts not made by mods must be approved to be public."
                    checked={form.approval_for_posting}
                    onChange={v => setForm(f => ({ ...f, approval_for_posting: v }))}
                />
            </SectionCard>

            <SectionCard title="Content Rules">
                <Checkbox
                    label="Allow AI Content"
                    hint="Permit videos generated by or with AI tools."
                    checked={form.allowAI}
                    onChange={v => setForm(f => ({ ...f, allowAI: v }))}
                />
                <TimeInput
                    label="Min Video Length"
                    hint="Shortest video allowed (mm:ss)"
                    value={form.minVideoLength}
                    format="mm:ss"
                    min={0}
                    max={3600}
                    error={errors.minVideoLength}
                    onChange={v => {
                        setForm(f => ({ ...f, minVideoLength: v }));
                        if (v < form.maxVideoLength) setErrors(e => ({ ...e, minVideoLength: undefined }));
                    }}
                />
                <TimeInput
                    label="Max Video Length"
                    hint="Longest video allowed (hh:mm:ss)"
                    value={form.maxVideoLength}
                    format="hh:mm:ss"
                    min={15}
                    max={43200}
                    error={errors.maxVideoLength}
                    onChange={v => {
                        setForm(f => ({ ...f, maxVideoLength: v }));
                        if (v > form.minVideoLength) setErrors(e => ({ ...e, maxVideoLength: undefined }));
                    }}
                />
            </SectionCard>
        </div>
    );
}

function CustomizationColumn({
                                 form, setForm, errors, setErrors,
                             }: {
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
    errors: FormErrors;
    setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [slugManual, setSlugManual] = useState(false);

    function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setErrors(err => ({ ...err, icon: 'Icon must be under 5 MB.' }));
            return;
        }
        setErrors(err => ({ ...err, icon: undefined }));
        const reader = new FileReader();
        reader.onload = ev => {
            if (typeof ev.target?.result === 'string') {
                setForm(f => ({ ...f, iconFile: file, iconPreview: ev.target!.result as string }));
            }
        };
        reader.readAsDataURL(file);
    }

    function handleNameChange(v: string) {
        const name = v.slice(0, 32);
        setForm(f => ({ ...f, name, slug: slugManual ? f.slug : slugify(name) }));
        if (v.trim()) setErrors(e => ({ ...e, name: undefined }));
    }

    function handleSlugChange(v: string) {
        setSlugManual(true);
        const slug = v.replace(/[^a-z0-9_-]/g, '').slice(0, 24);
        setForm(f => ({ ...f, slug }));
        if (slug) setErrors(e => ({ ...e, slug: undefined }));
    }

    return (
        <div className="flex flex-col gap-4">
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
                            {form.iconPreview ? (
                                <Image src={form.iconPreview} alt="Icon preview" width={64} height={64} className="object-cover w-full h-full" />
                            ) : (
                                <Upload className="w-5 h-5 text-muted-foreground" />
                            )}
                        </button>
                        <div className="flex flex-col gap-1">
                            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-semibold text-primary hover:underline text-left">
                                {form.iconPreview ? 'Change icon' : 'Upload icon'}
                            </button>
                            {form.iconPreview && (
                                <button type="button" onClick={() => setForm(f => ({ ...f, iconFile: null, iconPreview: '' }))} className="text-xs text-muted-foreground hover:text-destructive-foreground transition text-left">
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
                    <FieldError message={errors.icon} />
                </div>

                {/* Name */}
                <div>
                    <FieldLabel hint={`${form.name.length}/32 characters`}>Sector Name</FieldLabel>
                    <input
                        type="text"
                        value={form.name}
                        onChange={e => handleNameChange(e.target.value)}
                        placeholder="e.g. RC Planes"
                        maxLength={32}
                        className={`w-full px-3 py-2 rounded-lg bg-input border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition
                        ${errors.name ? 'border-destructive' : 'border-border'}`}
                    />
                    <FieldError message={errors.name} />
                </div>

                {/* Slug */}
                <div>
                    <FieldLabel hint={`${form.slug.length}/24 characters · Letters, numbers, _ and - only`}>Sector Slug</FieldLabel>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-3.5 w-3.5 h-3.5 text-muted-foreground">s/</span>
                        <input
                            type="text"
                            value={form.slug}
                            onChange={e => handleSlugChange(e.target.value)}
                            placeholder="rc_planes"
                            maxLength={24}
                            className={`w-full pl-8 pr-3 py-2 rounded-lg bg-input border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition font-mono
                            ${errors.slug ? 'border-destructive' : 'border-border'}`}
                        />
                    </div>
                    <FieldError message={errors.slug} />
                </div>
            </SectionCard>
        </div>
    );
}

function DescriptionColumn({ form, setForm }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>> }) {
    return (
        <div className="flex flex-col gap-4">
            <SectionCard title="About">
                <div>
                    <FieldLabel hint="Tell people what your Sector is about.">Description</FieldLabel>
                    <textarea
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="The place for RC enthusiasts to post their best flights, builds, and crashes."
                        rows={5}
                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition resize-none"
                    />
                </div>
            </SectionCard>
        </div>
    );
}

function RulesSection({ rules, setRules }: { rules: string[]; setRules: (r: string[]) => void }) {
    function updateRule(i: number, value: string) {
        const next = [...rules];
        next[i] = value;
        setRules(next);
    }
    function removeRule(i: number) { setRules(rules.filter((_, idx) => idx !== i)); }
    function addRule() { if (rules.length < 20) setRules([...rules, '']); }

    return (
        <SectionCard title={`Sector Rules · ${rules.length}/20`}>
            <p className="text-xs text-muted-foreground -mt-2">Rules are shown to members and help moderators make consistent decisions.</p>
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
                        <button type="button" onClick={() => removeRule(i)} className="text-muted-foreground hover:text-destructive-foreground transition p-1 rounded">
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
    );
}

// -------- Page --------

export default function NewSectorPage() {
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();

    const [form, setForm] = useState<FormState>(defaultForm);
    const [location, setLocation] = useState<PickedCoords | null>(null);
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);

    function validate(): boolean {
        const next: FormErrors = {};

        if (!form.name.trim())
            next.name = 'Sector name is required.';
        else if (form.name.toLowerCase() === 'all')
            next.name = '"All" is a reserved name and cannot be used.';

        if (!form.slug.trim())
            next.slug = 'Sector slug is required.';
        else if (!/^[a-z0-9_-]{1,24}$/.test(form.slug))
            next.slug = 'Slug may only contain a–z, 0–9, _ and -.';
        else if (form.slug.toLowerCase() === 'all')
            next.slug = '"all" is a reserved slug and cannot be used.';

        if (form.minVideoLength >= form.maxVideoLength) {
            next.minVideoLength = 'Min length must be less than max length.';
            next.maxVideoLength = 'Max length must be greater than min length.';
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    }

    async function handleSubmit() {
        if (!validate()) return;
        setSubmitting(true);
        setErrors({});

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                router.push('/auth');
                return;
            }

            // 1. Upload icon if one was chosen
            let iconUrl: string | null = null;
            if (form.iconFile) {
                const ext = form.iconFile.name.split('.').pop();
                const filePath = `sectors/icon-${Date.now()}.${ext}`;
                const { error: uploadError } = await supabase.storage
                    .from('sector-images')
                    .upload(filePath, form.iconFile);
                if (uploadError) throw new Error(`Icon upload failed: ${uploadError.message}`);
                const { data: { publicUrl } } = supabase.storage.from('sector-images').getPublicUrl(filePath);
                iconUrl = publicUrl;
            }

            // 2. Insert the sector
            const { data: sector, error: sectorError } = await supabase
                .from('sectors')
                .insert({
                    slug:                 form.slug,
                    name:                 form.name.trim(),
                    description:          form.description.trim() || null,
                    icon:                 iconUrl,
                    star_map:             form.starMap,
                    private_access:       form.privateAccess,
                    open_posting:         form.open_posting,
                    approval_for_posting: form.approval_for_posting,
                    allow_ai:             form.allowAI,
                    min_video_length:     form.minVideoLength,
                    max_video_length:     form.maxVideoLength,
                    rules:                form.rules.filter(r => r.trim() !== ''),
                    // only written when the sector is on the star map and a spot was chosen
                    galaxy_x: form.starMap ? (location?.galaxy_x ?? null) : null,
                    galaxy_y: form.starMap ? (location?.galaxy_y ?? null) : null,
                })
                .select('id, slug')
                .single();

            if (sectorError) {
                if (sectorError.message.includes('duplicate key') && sectorError.message.includes('slug')) {
                    setErrors({ slug: 'This slug is already taken. Try another.' });
                    return;
                }
                if (sectorError.message.includes('duplicate key') && sectorError.message.includes('name')) {
                    setErrors({ name: 'A Sector with this name already exists.' });
                    return;
                }
                throw sectorError;
            }

            // 3. Add the creator as owner in sector_members
            const { error: memberError } = await supabase
                .from('sector_members')
                .insert({
                    sector_id: sector.id,
                    user_id: authUser.id,
                    roles: ['owner'],
                    permissions: [],
                });
            if (memberError) throw memberError;

            // 4. Redirect to the new sector
            router.push(`/s/${sector.slug}`);

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
            setErrors(e => ({ ...e, submit: message }));
        } finally {
            setSubmitting(false);
        }
    }

    const canSubmit = form.name.trim() && form.slug.trim() && !submitting;

    return (
        <div className="flex flex-col gap-8 py-6 animate-[fade-in-up_0.5s_ease-out_forwards]">
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Found a Sector</h1>
                <p className="text-sm text-muted-foreground">Set up your community. You can change these settings later.</p>
            </div>
            <hr className="border-border -mt-4" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <AdvancedOptionsColumn form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                <CustomizationColumn form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
                <DescriptionColumn form={form} setForm={setForm} />
            </div>

            {/* Star Map + Rules — side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                {/* Left + Middle: Star Map (or spacer when hidden) */}
                <div className="lg:col-span-2">
                    {form.starMap && (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-0.5">
                                <h3 className="text-sm font-semibold text-foreground">Star Map Location</h3>
                                <p className="text-xs text-muted-foreground">
                                    Click an empty spot on the map to choose where your Sector appears.
                                    {!location && <span className="text-muted-foreground/60"> (Optional — we'll place it automatically if you skip this.)</span>}
                                </p>
                            </div>
                            <StarMapPicker
                                value={location}
                                onChange={setLocation}
                                previewName={form.name || 'New Sector'}
                                height={660}
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
                </div>

                {/* Right: Rules */}
                <div className="pt-0 lg:pt-12">
                    <RulesSection rules={form.rules} setRules={r => setForm(f => ({ ...f, rules: r }))} />
                </div>
            </div>

            {errors.submit && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive-foreground text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errors.submit}
                </div>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                    {submitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    ) : (
                        <><Plus className="w-4 h-4" /> Create Sector</>
                    )}
                </button>
            </div>
        </div>
    );
}
