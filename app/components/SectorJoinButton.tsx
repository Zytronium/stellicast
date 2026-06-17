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
    const [error, setError] = useState<string | null>(null);
    const supabase = createSupabaseBrowserClient();

    // Owners can't leave via this button - they'd orphan the sector
    if (memberRole === 'owner') return null;

    async function handleJoin() {
        setLoading(true);
        setError(null);

        // Check for active ban first
        const { data: ban } = await supabase
            .from('sector_bans')
            .select('banned_until')
            .eq('sector_id', sectorId)
            .eq('user_id', userId)
            .or(`banned_until.is.null,banned_until.gt.${new Date().toISOString()}`)
            .maybeSingle();

        if (ban) {
            setError(ban.banned_until
                ? `You are banned from this sector until ${new Date(ban.banned_until).toLocaleDateString()}.`
                : 'You are permanently banned from this sector.'
            );
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from('sector_members')
            .insert({ sector_id: sectorId, user_id: userId, roles: ['member'], permissions: [] });

        if (error) {
            setError('Failed to join. Please try again.');
        } else {
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

return (
        <div className="flex flex-col items-end justify-center">
            {member ? (
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
            )}
            {error && (
                <p className="text-xs text-destructive mt-1">{error}</p>
            )}
        </div>
    );
}
