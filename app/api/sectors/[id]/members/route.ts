import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const sectorId = (await params).id;

    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { action, targetUserId, newRole, reason, banUntil } = await request.json();

        // Verify requester has permission in this sector
        const { data: requesterMembership } = await supabase
            .from('sector_members')
            .select('roles')
            .eq('sector_id', sectorId)
            .eq('user_id', user.id)
            .single();

        if (
            !requesterMembership?.roles.includes('admin') &&
            !requesterMembership?.roles.includes('moderator') &&
            !requesterMembership?.roles.includes('owner')
        ) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Action: change role
        if (action === 'change_role') {
        const { data: targetMembership } = await supabase
            .from('sector_members')
            .select('roles')
            .eq('sector_id', sectorId)
            .eq('user_id', targetUserId)
            .single();

        if (!targetMembership) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

            // Verify requester rank > target rank
            const roleRank: Record<string, number> = { owner: 4, admin: 3, moderator: 2, contributor: 1, member: 0 };
            const requesterMaxRank = Math.max(...(requesterMembership.roles as string[]).map(r => roleRank[r] || 0));
            const targetMaxRank = Math.max(...targetMembership.roles.map((r: string) => roleRank[r] || 0));

            if (requesterMaxRank <= targetMaxRank) {
                return NextResponse.json({ error: 'Cannot change role of equal or higher rank' }, { status: 403 });
            }

            const { error } = await supabase
                .from('sector_members')
                .update({ roles: [newRole] })
                .eq('sector_id', sectorId)
                .eq('user_id', targetUserId);

            if (error) throw error;

            return NextResponse.json({ success: true, message: 'Role updated' });
        }

        // Action: ban member
        if (action === 'ban') {
            const { data: targetMembership } = await supabase
                .from('sector_members')
                .select('roles')
                .eq('sector_id', sectorId)
                .eq('user_id', targetUserId)
                .single();

            if (!targetMembership) {
                return NextResponse.json({ error: 'Member not found' }, { status: 404 });
            }

            const { error } = await supabase
                .from('sector_bans')
                .insert({
                    sector_id: sectorId,
                    user_id: targetUserId,
                    banned_by_id: user.id,
                    ban_reason: reason,
                    banned_until: banUntil || null,
                });

            if (error) {
                if (error.message.includes('duplicate')) {
                    return NextResponse.json({ error: 'User is already banned' }, { status: 409 });
                }
                throw error;
            }

            // Remove from members list
            await supabase
                .from('sector_members')
                .delete()
                .eq('sector_id', sectorId)
                .eq('user_id', targetUserId);

            return NextResponse.json({ success: true, message: 'Member banned' });
        }

        // Action: unban
        if (action === 'unban') {
            const { error } = await supabase
                .from('sector_bans')
                .delete()
                .eq('id', targetUserId); // targetUserId carries the banId for this action

            if (error) throw error;

            return NextResponse.json({ success: true, message: 'Ban removed' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err) {
        console.error('Sector members API error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const sectorId = (await params).id;

    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Get all members with user details
        const { data: members, error: membersError } = await supabase
            .from('sector_members')
            .select(`sector_id, user_id, roles, permissions, joined_at, users (username, display_name, avatar_url)`)
            .eq('sector_id', sectorId)
            .order('joined_at', { ascending: true });

        if (membersError) throw membersError;

        // Get bans
        const { data: bans, error: bansError } = await supabase
            .from('sector_bans')
            .select(`id, sector_id, user_id, banned_by_id, ban_reason, banned_until, created_at, users!sector_bans_user_id_fkey (username, display_name, avatar_url), banned_by:users!sector_bans_banned_by_id_fkey (username, display_name)`)
            .eq('sector_id', sectorId);

        if (bansError) throw bansError;

        return NextResponse.json({
            members: members?.map(m => ({
                ...m,
                username: (m.users as any)?.username,
                display_name: (m.users as any)?.display_name,
                avatar_url: (m.users as any)?.avatar_url,
            })),
            bans: bans?.map(b => ({
                ...b,
                username: (b.users as any)?.username,
                display_name: (b.users as any)?.display_name,
                avatar_url: (b.users as any)?.avatar_url,
                banned_by_username: (b.banned_by as any)?.username,
            })),
        });
    } catch (err) {
        console.error('Sector members list error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
