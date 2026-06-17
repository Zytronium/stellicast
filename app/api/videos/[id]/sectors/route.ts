import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

type RouteParams = {
    params: Promise<{ id: string }>;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type OwnedVideo = {
    id: string;
    channel_id: string;
    is_ai: boolean;
    duration: number | null;
};

// -------- ownership check --------
// Confirms the requesting user owns the channel the video belongs to.
// Returns the video row (with the fields the route needs) or null.
async function getOwnedVideo(
    supabase: SupabaseServerClient,
    videoId: string,
    userId: string
): Promise<OwnedVideo | null> {
    const { data: video, error } = await supabase
        .from('videos')
        .select('id, channel_id, is_ai, duration, channels!inner(owner_id)')
        .eq('id', videoId)
        .single();

    if (error || !video)
        return null;

    const channel = video.channels as unknown as { owner_id: string } | null;
    if (!channel || channel.owner_id !== userId)
        return null;

    return {
        id: video.id,
        channel_id: video.channel_id,
        is_ai: video.is_ai,
        duration: video.duration,
    };
}

// -------- GET: list sectors with assignment status --------
export async function GET(_request: NextRequest, { params }: RouteParams) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (!user)
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const video = await getOwnedVideo(supabase, id, user.id);
    if (!video)
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });

    const { data: sectors, error: sectorsError } = await supabase
        .from('sectors')
        .select('id, name, slug, icon, open_posting, approval_for_posting, allow_ai, min_video_length, max_video_length, private_access')
        .order('name');

    if (sectorsError)
        return NextResponse.json({ error: sectorsError.message }, { status: 500 });

    const { data: assignedRows, error: assignedError } = await supabase
        .from('sector_videos')
        .select('sector_id, approval_status')
        .eq('video_id', id);

    if (assignedError)
        return NextResponse.json({ error: assignedError.message }, { status: 500 });

    const assignedMap = new Map((assignedRows ?? []).map((row) => [row.sector_id, row.approval_status]));

    const result = (sectors ?? []).map((sector) => ({
        ...sector,
        assigned: assignedMap.has(sector.id),
        approval_status: assignedMap.get(sector.id) ?? null,
    }));

    return NextResponse.json({ sectors: result });
}

// -------- POST: add the video to a sector --------
export async function POST(request: NextRequest, { params }: RouteParams) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (!user)
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const sectorId = body?.sector_id;
    if (!sectorId)
        return NextResponse.json({ error: 'sector_id is required' }, { status: 400 });

    const video = await getOwnedVideo(supabase, id, user.id);
    if (!video)
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });

    const { data: sector, error: sectorError } = await supabase
        .from('sectors')
        .select('id, private_access, open_posting, approval_for_posting, allow_ai, min_video_length, max_video_length')
        .eq('id', sectorId)
        .single();

    if (sectorError || !sector)
        return NextResponse.json({ error: 'Sector not found' }, { status: 404 });

    // -------- content rules --------
    if (video.is_ai && !sector.allow_ai)
        return NextResponse.json({ error: "This sector doesn't allow AI-generated content" }, { status: 400 });

    if (
        video.duration != null &&
        (video.duration < sector.min_video_length || video.duration > sector.max_video_length)
    ) {
        return NextResponse.json({ error: "This video doesn't meet the sector's length requirements" }, { status: 400 });
    }

    // -------- posting permission --------
    // Private sectors always require membership (mirrors the RLS policy).
    // When open_posting is off, members also need at least an hour of
    // tenure in the sector before they can post, to cut down on
    // brand-new-membership spam.
    if (sector.private_access || !sector.open_posting) {
        const { data: membership } = await supabase
            .from('sector_members')
            .select('joined_at')
            .eq('sector_id', sectorId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!membership)
            return NextResponse.json({ error: 'You must be a member of this sector to post here' }, { status: 403 });

        if (!sector.open_posting) {
            const oneHourMs = 60 * 60 * 1000;
            const memberSince = new Date(membership.joined_at).getTime();
            if (Date.now() - memberSince < oneHourMs) {
                return NextResponse.json({ error: 'You must be a member of this sector for at least an hour before posting' }, { status: 403 });
            }
        }
    }

    const approvalStatus = sector.approval_for_posting ? 'pending' : 'approved';

    const { data, error } = await supabase
        .from('sector_videos')
        .insert({ sector_id: sectorId, video_id: id, approval_status: approvalStatus })
        .select('sector_id, approval_status')
        .single();

    if (error) {
        if (error.code === '23505')
            return NextResponse.json({ error: 'This video is already in that sector' }, { status: 409 });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sector_id: data.sector_id, approval_status: data.approval_status });
}

// -------- DELETE: remove the video from a sector --------
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (!user)
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const sectorId = body?.sector_id;
    if (!sectorId)
        return NextResponse.json({ error: 'sector_id is required' }, { status: 400 });

    const video = await getOwnedVideo(supabase, id, user.id);
    if (!video)
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });

    const { error } = await supabase
        .from('sector_videos')
        .delete()
        .eq('video_id', id)
        .eq('sector_id', sectorId);

    if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
}
