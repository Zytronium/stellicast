import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { NextResponse } from 'next/server';
import { hasPermission } from '@/../lib/sector-utils';
import type { SectorRole } from '@/../types';

export const dynamic = 'force-dynamic';

// -------- Permission check helper --------

async function getRequesterRoles(supabase: any, sectorId: string, userId: string): Promise<SectorRole[]> {
    const { data } = await supabase
        .from('sector_members')
        .select('roles')
        .eq('sector_id', sectorId)
        .eq('user_id', userId)
        .single();
    return (data?.roles ?? []) as SectorRole[];
}

// -------- GET - list pending approvals --------

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const sectorId = (await params).id;

    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const roles = await getRequesterRoles(supabase, sectorId, user.id);
        if (!hasPermission(roles, 'approve_posts'))
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });


        const { data, error } = await supabase
            .from('sector_videos')
            .select(`
        video_id,
        approval_status,
        videos (
          id,
          slug,
          title,
          thumbnail_url,
          duration,
          created_at,
          channels (
            display_name,
            handle,
            avatar_url
          )
        )
      `)
            .eq('sector_id', sectorId)
            .eq('approval_status', 'pending');

        if (error)
            throw error;

        const pending = (data ?? []).map(row => {
            const vid = row.videos as any;
            return {
                video_id: row.video_id,
                video: {
                    id: vid?.id ?? null,
                    slug: vid?.slug ?? null,
                    title: vid?.title ?? 'Untitled',
                    thumbnail_url: vid?.thumbnail_url ?? null,
                    duration: vid?.duration ?? null,
                    created_at: vid?.created_at ?? null,
                    channel: vid?.channels ?? null,
                },
            };
        });

        return NextResponse.json({ pending });
    } catch (err) {
        console.error('Approvals GET error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error' },
            { status: 500 },
        );
    }
}

// -------- PATCH - approve or reject a pending video --------

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const sectorId = (await params).id;

    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const roles = await getRequesterRoles(supabase, sectorId, user.id);
        if (!hasPermission(roles, 'approve_posts'))
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });


        const body = await request.json();
        const { video_id, action } = body;

        if (!video_id || !['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { error: 'video_id and action ("approve" or "reject") are required' },
                { status: 400 },
            );
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // Only update rows that are still pending - prevents double-processing
        const { error, count } = await supabase
            .from('sector_videos')
            .update({ approval_status: newStatus }, { count: 'exact' })
            .eq('sector_id', sectorId)
            .eq('video_id', video_id)
            .eq('approval_status', 'pending');

        if (error)
            throw error;

        if (count === 0) {
            return NextResponse.json(
                { error: 'Video not found in pending queue for this sector' },
                { status: 404 },
            );
        }

        return NextResponse.json({ success: true, status: newStatus });
    } catch (err) {
        console.error('Approvals PATCH error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error' },
            { status: 500 },
        );
    }
}
