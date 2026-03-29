'use client';

import { useState, useEffect, useRef } from 'react';
import { PlusIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';

interface Sector {
    id: string;
    slug: string;
    name: string;
    icon: string | null;
}

interface Props {
    selectedSectors: Sector[];
    onChange: (sectors: Sector[]) => void;
    isTest: boolean;
    onIsTestChange: (v: boolean) => void;
}

const MAX_SECTORS = 5;

export default function SectorSelector({ selectedSectors, onChange, isTest, onIsTestChange }: Props) {
    const supabase = createSupabaseBrowserClient();
    const [allSectors, setAllSectors] = useState<Sector[]>([]);
    const [miscSector, setMiscSector] = useState<Sector | null>(null);
    const [testingSector, setTestingSector] = useState<Sector | null>(null);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function fetchSectors() {
            const { data } = await supabase
                .from('sectors')
                .select('id, slug, name, icon')
                .eq('private_access', false)
                .order('name');
            if (data) {
                const typed = data as Sector[];
                setAllSectors(typed);
                const misc = typed.find(s => s.slug === 'misc') ?? null;
                const testing = typed.find(s => s.slug === 'testing') ?? null;
                setMiscSector(misc);
                setTestingSector(testing);
                // Default to misc
                if (misc && selectedSectors.length === 0) {
                    onChange([misc]);
                }
            }
            setLoading(false);
        }
        fetchSectors();
    }, []);

    // Handle isTest toggle
    useEffect(() => {
        if (isTest && testingSector) {
            onChange([testingSector]);
        } else if (!isTest && miscSector && selectedSectors.every(s => s.slug === 'testing')) {
            onChange([miscSector]);
        }
    }, [isTest, testingSector]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function removeSector(id: string) {
        const next = selectedSectors.filter(s => s.id !== id);
        // If all removed, fall back to misc
        onChange(next.length === 0 && miscSector ? [miscSector] : next);
    }

    function addSector(sector: Sector) {
        if (selectedSectors.find(s => s.id === sector.id)) return;

        let next: Sector[];
        if (sector.slug === 'misc') {
            // misc replaces everything
            next = [sector];
        } else {
            // Adding a real sector — remove misc if present
            const withoutMisc = selectedSectors.filter(s => s.slug !== 'misc');
            next = [...withoutMisc, sector].slice(0, MAX_SECTORS);
        }
        onChange(next);
        setOpen(false);
        setQuery('');
    }

    const selectedIds = new Set(selectedSectors.map(s => s.id));
    const isMiscOnly = selectedSectors.length === 1 && selectedSectors[0]?.slug === 'misc';

    const filtered = allSectors.filter(s => {
        if (selectedIds.has(s.id)) return false;
        if (s.slug === 'testing') return false; // never manually selectable
        // If a non-misc sector is selected, hide misc in dropdown
        if (s.slug === 'misc' && !isMiscOnly) return false;
        if (!query) return true;
        return s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.slug.toLowerCase().includes(query.toLowerCase());
    });

    const canAdd = !isTest && selectedSectors.length < MAX_SECTORS;

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-muted-foreground">Sectors</label>

            {/* Selected pills */}
            <div className="flex flex-wrap gap-2 items-center">
                {loading ? (
                    <div className="h-7 w-20 bg-muted rounded-lg animate-pulse" />
                ) : (
                    selectedSectors.map(sector => (
                        <span
                            key={sector.id}
                            className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg border text-sm font-medium transition-colors
                ${sector.slug === 'misc'
                                ? 'bg-muted/60 border-border text-muted-foreground'
                                : sector.slug === 'testing'
                                    ? 'bg-warning/10 border-warning/30 text-warning-foreground'
                                    : 'bg-primary/10 border-primary/30 text-primary'
                            }`}
                        >
              <span className="font-mono text-xs opacity-60">s/</span>{sector.slug}
                            {!isTest && (
                                <button
                                    type="button"
                                    onClick={() => removeSector(sector.id)}
                                    className="rounded p-0.5 hover:bg-black/10 transition-colors"
                                    aria-label={`Remove ${sector.name}`}
                                >
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
            </span>
                    ))
                )}

                {/* Add button */}
                {canAdd && !loading && (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(o => !o);
                                setTimeout(() => inputRef.current?.focus(), 50);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                            <PlusIcon className="w-3.5 h-3.5" />
                            Add sector
                        </button>

                        {open && (
                            <div className="absolute top-full left-0 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
                                {/* Search */}
                                <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                                    <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={query}
                                        onChange={e => setQuery(e.target.value)}
                                        placeholder="Search sectors..."
                                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                                    />
                                </div>

                                {/* Results */}
                                <div className="max-h-48 overflow-y-auto">
                                    {filtered.length === 0 ? (
                                        <p className="text-xs text-muted-foreground text-center py-4">No sectors found</p>
                                    ) : (
                                        filtered.map(sector => (
                                            <button
                                                key={sector.id}
                                                type="button"
                                                onClick={() => addSector(sector)}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                                            >
                                                <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0 overflow-hidden">
                                                    {sector.icon
                                                        ? <img src={sector.icon} alt="" className="w-full h-full object-cover" />
                                                        : sector.name[0].toUpperCase()
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">{sector.name}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">s/{sector.slug}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Misc hint */}
            {isMiscOnly && !isTest && (
                <p className="text-xs text-muted-foreground">
                    Defaulting to <span className="font-mono">s/misc</span>. Add a sector above if a relevant one exists.
                </p>
            )}

            {/* Is test checkbox */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                    type="checkbox"
                    checked={isTest}
                    onChange={e => onIsTestChange(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm text-foreground">
          This is a test upload{' '}
                    <span className="text-xs text-muted-foreground">(posts only to s/testing)</span>
        </span>
            </label>
        </div>
    );
}
