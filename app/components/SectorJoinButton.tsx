'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import { Loader2 } from 'lucide-react';

interface Props {
    sectorId: string;
    userId: string;
    isMember: boolean;
    memberRole: string | null;
    onJoin?: () => void;
    onLeave?: () => void;
}

export default function SectorJoinButton({ sectorId, userId, isMember, memberRole, onJoin, onLeave }: Props) {
    const [member, setMember] = useState(isMember);
    const [loading, setLoading] = useState(false);
    const supabase = createSupabaseBrowserClient();

    // Owners can't leave via this button — they'd orphan the sector
    if (memberRole === 'owner') return null;

    async function handleJoin() {
        setLoading(true);
        const { error } = await supabase
            .from('sector_members')
            .insert({ sector_id: sectorId, user_id: userId, roles: ['member'], permissions: [] });
        if (!error) {
            setMember(true);
            onJoin?.();
        }
        setLoading(false);
    }

    async function handleLeave() {
        setLoading(true);
        const { error } = await supabase
            .from('sector_members')
            .delete()
            .eq('sector_id', sectorId)
            .eq('user_id', userId);
        if (!error) {
            setMember(false);
            onLeave?.();
        }
        setLoading(false);
    }

    return member ? (
        <button
            onClick={handleLeave}
            disabled={loading}
            className="flex-shrink-0 h-9 px-5 rounded-full border border-border bg-background text-sm font-medium text-muted-foreground hover:border-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Leave'}
        </button>
    ) : (
        <button
            onClick={handleJoin}
            disabled={loading}
            className="flex-shrink-0 h-9 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-50"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join'}
        </button>
    );
}
