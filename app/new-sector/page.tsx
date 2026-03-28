'use client';

import { useState, useRef, useCallback } from "react";
import { Upload, X, Hash, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
    return (
        <div className="flex flex-col gap-0.5 mb-1.5">
            <label className="text-sm font-semibold text-foreground">{children}</label>
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
    );
}

function Checkbox({
                      label,
                      hint,
                      checked,
                      onChange,
                  }: {
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5 relative flex-shrink-0">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                    className="sr-only"
                />
                <div
                    className={`w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center
            ${checked
                        ? 'bg-primary border-primary'
                        : 'bg-input border-border group-hover:border-muted-foreground'
                    }`}
                >
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
                       label,
                       hint,
                       value,
                       format,
                       min,
                       max,
                       onChange,
                   }: {
    label: string;
    hint?: string;
    value: number;
    format: 'mm:ss' | 'hh:mm:ss';
    min: number;
    max: number;
    onChange: (seconds: number) => void;
}) {
    const displayValue = format === 'mm:ss' ? formatMinSec(value) : formatHourMinSec(value);
    const placeholder = format === 'mm:ss' ? '00:00' : '00:00:00';

    function handleBlur(raw: string) {
        const parsed = format === 'mm:ss' ? parseMinSec(raw) : parseHourMinSec(raw);
        if (!isNaN(parsed)) {
            onChange(Math.min(max, Math.max(min, parsed)));
        }
    }

    return (
        <div>
            <FieldLabel hint={hint}>{label}</FieldLabel>
            <input
                type="text"
                defaultValue={displayValue}
                placeholder={placeholder}
                onBlur={e => handleBlur(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition font-mono"
            />
        </div>
    );
}

// ─── Column Components ────────────────────────────────────────────────────────

function AdvancedOptionsColumn({
                                   form,
                                   setForm,
                               }: {
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
    return (
        <div className="flex flex-col gap-4">
            <SectionCard title="Privacy">
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
                    onChange={v => setForm(f => ({ ...f, minVideoLength: v }))}
                />
                <TimeInput
                    label="Max Video Length"
                    hint="Longest video allowed (hh:mm:ss)"
                    value={form.maxVideoLength}
                    format="hh:mm:ss"
                    min={15}
                    max={43200}
                    onChange={v => setForm(f => ({ ...f, maxVideoLength: v }))}
                />
            </SectionCard>
        </div>
    );
}

function CustomizationColumn({
                                 form,
                                 setForm,
                             }: {
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [iconError, setIconError] = useState('');
    const [slugManual, setSlugManual] = useState(false);

    function handleIconChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setIconError('Icon must be under 5 MB.');
            return;
        }
        setIconError('');
        const url = URL.createObjectURL(file);
        setForm(f => ({ ...f, iconFile: file, iconPreview: url }));
    }

    function handleNameChange(v: string) {
        setForm(f => ({
            ...f,
            name: v.slice(0, 32),
            slug: slugManual ? f.slug : slugify(v),
        }));
    }

    function handleSlugChange(v: string) {
        setSlugManual(true);
        setForm(f => ({ ...f, slug: v.replace(/[^a-z0-9_-]/g, '').slice(0, 24) }));
    }

    return (
        <div className="flex flex-col gap-4">
            <SectionCard title="Identity">
                {/* Icon upload */}
                <div>
                    <FieldLabel hint="Optional. Max 5 MB. Square images work best.">Sector Icon</FieldLabel>
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
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="text-xs font-semibold text-primary hover:underline text-left"
                            >
                                {form.iconPreview ? 'Change icon' : 'Upload icon'}
                            </button>
                            {form.iconPreview && (
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, iconFile: null, iconPreview: '' }))}
                                    className="text-xs text-muted-foreground hover:text-destructive-foreground transition text-left"
                                >
                                    Remove
                                </button>
                            )}
                            {iconError && <span className="text-xs text-destructive-foreground">{iconError}</span>}
                        </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleIconChange} />
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
                        className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition"
                    />
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
                            className="w-full pl-7 pr-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition font-mono"
                        />
                    </div>
                </div>
            </SectionCard>
        </div>
    );
}

function DescriptionColumn({
                               form,
                               setForm,
                           }: {
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
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

function RulesSection({
                          rules,
                          setRules,
                      }: {
    rules: string[];
    setRules: (r: string[]) => void;
}) {
    function updateRule(i: number, value: string) {
        const next = [...rules];
        next[i] = value;
        setRules(next);
    }

    function removeRule(i: number) {
        setRules(rules.filter((_, idx) => idx !== i));
    }

    function addRule() {
        if (rules.length < 20) setRules([...rules, '']);
    }

    return (
        <SectionCard title={`Sector Rules  ·  ${rules.length}/20`}>
            <p className="text-xs text-muted-foreground -mt-2">
                Rules are shown to members and help moderators make consistent decisions.
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
                    <button
                        type="button"
                        onClick={addRule}
                        className="flex items-center gap-2 text-xs text-primary hover:underline mt-1 self-start"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add rule
                    </button>
                )}
            </div>
        </SectionCard>
    );
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface FormState {
    starMap: boolean;
    privateAccess: boolean;
    allowAI: boolean;
    minVideoLength: number;  // seconds
    maxVideoLength: number;  // seconds
    iconFile: File | null;
    iconPreview: string;
    name: string;
    slug: string;
    description: string;
    rules: string[];
}

const defaultForm: FormState = {
    starMap: true,
    privateAccess: false,
    allowAI: true,
    minVideoLength: 1,
    maxVideoLength: 28800, // 8 hours
    iconFile: null,
    iconPreview: '',
    name: '',
    slug: '',
    description: '',
    rules: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewSectorPage() {
    const [form, setForm] = useState<FormState>(defaultForm);

    function handleSubmit() {
        // TODO: wire up to Supabase
        console.log(form);
    }

    return (
        <div className="flex flex-col gap-8 py-6 animate-[fade-in-up_0.5s_ease-out_forwards]">

            {/* Page header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Found a Sector</h1>
                <p className="text-sm text-muted-foreground">
                    Set up your community. You can change these settings later.
                </p>
            </div>
            <hr className="border-border -mt-4" />

            {/* 3-column grid on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <AdvancedOptionsColumn form={form} setForm={setForm} />
                <CustomizationColumn form={form} setForm={setForm} />
                <DescriptionColumn form={form} setForm={setForm} />
            </div>

            {/* Rules — spans middle + right on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="hidden lg:block" aria-hidden /> {/* spacer for left column */}
                <div className="lg:col-span-2">
                    <RulesSection rules={form.rules} setRules={r => setForm(f => ({ ...f, rules: r }))} />
                </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!form.name || !form.slug}
                    className="px-8 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                    Create Sector
                </button>
            </div>
        </div>
    );
}
