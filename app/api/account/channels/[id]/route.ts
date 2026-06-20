import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

// -------- helpers --------

function err(msg: string, status: number) {
    return NextResponse.json({ error: msg }, { status });
}

function adminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_API_KEY;
    if (!url || !key) throw new Error('Missing Supabase service role env vars');
    return createClient(url, key, { auth: { persistSession: false } });
}

// -------- DELETE /api/account/channels/[id] --------

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: channelId } = await params;

    // -------- auth check (regular client, RLS-bound) --------
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return err('Unauthorized', 401);
    }

    // -------- ownership check --------
    const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('id, owner_id')
        .eq('id', channelId)
        .single();

    if (channelError || !channel) {
        return err('Channel not found', 404);
    }

    if (channel.owner_id !== user.id) {
        return err('Forbidden', 403);
    }

    // -------- cascade delete (service role - bypasses RLS) --------
    // All ownership is already verified above; service role is used purely
    // to avoid FK constraint errors that RLS cannot help with.
    const admin = adminClient();

    // Collect video IDs for this channel
    const { data: videoRows, error: videoFetchErr } = await admin
        .from('videos')
        .select('id')
        .eq('channel_id', channelId);

    if (videoFetchErr) {
        return err(`Failed to fetch videos: ${videoFetchErr.message}`, 500);
    }

    const videoIds = (videoRows ?? []).map((v: { id: string }) => v.id);

    if (videoIds.length > 0) {
        // Collect comment IDs for these videos
        const { data: commentRows, error: commentFetchErr } = await admin
            .from('comments')
            .select('id')
            .in('video_id', videoIds);

        if (commentFetchErr) {
            return err(`Failed to fetch comments: ${commentFetchErr.message}`, 500);
        }

        const commentIds = (commentRows ?? []).map((c: { id: string }) => c.id);

        if (commentIds.length > 0) {
            // -------- comment child tables --------
            const { error: e1 } = await admin
                .from('comment_engagement_rate_limits')
                .delete()
                .in('comment_id', commentIds);
            if (e1) return err(`comment_engagement_rate_limits: ${e1.message}`, 500);

            const { error: e2 } = await admin
                .from('comment_likes')
                .delete()
                .in('comment_id', commentIds);
            if (e2) return err(`comment_likes: ${e2.message}`, 500);

            const { error: e3 } = await admin
                .from('comment_dislikes')
                .delete()
                .in('comment_id', commentIds);
            if (e3) return err(`comment_dislikes: ${e3.message}`, 500);

            // -------- replies before root comments (self-referential FK) --------
            const { error: e4 } = await admin
                .from('comments')
                .delete()
                .not('parent_comment_id', 'is', null)
                .in('video_id', videoIds);
            if (e4) return err(`comment replies: ${e4.message}`, 500);

            const { error: e5 } = await admin
                .from('comments')
                .delete()
                .in('video_id', videoIds);
            if (e5) return err(`comments: ${e5.message}`, 500);
        }

        // -------- video child tables --------
        const { error: e6 } = await admin
            .from('engagement_rate_limits')
            .delete()
            .in('video_id', videoIds);
        if (e6) return err(`engagement_rate_limits: ${e6.message}`, 500);

        const { error: e7 } = await admin
            .from('video_likes')
            .delete()
            .in('video_id', videoIds);
        if (e7) return err(`video_likes: ${e7.message}`, 500);

        const { error: e8 } = await admin
            .from('video_dislikes')
            .delete()
            .in('video_id', videoIds);
        if (e8) return err(`video_dislikes: ${e8.message}`, 500);

        const { error: e9 } = await admin
            .from('video_stars')
            .delete()
            .in('video_id', videoIds);
        if (e9) return err(`video_stars: ${e9.message}`, 500);

        const { error: e10 } = await admin
            .from('view_rate_limits')
            .delete()
            .in('video_id', videoIds);
        if (e10) return err(`view_rate_limits: ${e10.message}`, 500);

        const { error: e11 } = await admin
            .from('sector_videos')
            .delete()
            .in('video_id', videoIds);
        if (e11) return err(`sector_videos: ${e11.message}`, 500);

        // -------- videos --------
        const { error: e12 } = await admin
            .from('videos')
            .delete()
            .eq('channel_id', channelId);
        if (e12) return err(`videos: ${e12.message}`, 500);
    }

    // -------- channel child tables --------
    const { error: e13 } = await admin
        .from('followers')
        .delete()
        .eq('channel_id', channelId);
    if (e13) return err(`followers: ${e13.message}`, 500);

    // Only one of these will have a row, but deleting from both is safe
    const { error: e14 } = await admin
        .from('creators')
        .delete()
        .eq('channel_id', channelId);
    if (e14) return err(`creators: ${e14.message}`, 500);

    const { error: e15 } = await admin
        .from('studios')
        .delete()
        .eq('channel_id', channelId);
    if (e15) return err(`studios: ${e15.message}`, 500);

    // -------- channel --------
    const { error: e16 } = await admin
        .from('channels')
        .delete()
        .eq('id', channelId);
    if (e16) return err(`channel: ${e16.message}`, 500);

    return NextResponse.json({ success: true });
}
