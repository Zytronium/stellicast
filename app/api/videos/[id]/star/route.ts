import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/../lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: videoId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const watchedSeconds = typeof body?.watchedSeconds === 'number' ? Math.floor(body.watchedSeconds) : 0;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createSupabaseAdminClient();

    const { data: videoExists, error: videoErr } = await adminClient.from('videos').select('id').eq('id', videoId).single();
    if (videoErr || !videoExists) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

    const rpcRes = await adminClient.rpc('user_star', { p_user: user.id, p_video: videoId, p_watched_seconds: watchedSeconds }).single();

    if (rpcRes.error) {
      const msg = String(rpcRes.error.message || rpcRes.error).toLowerCase();
      if (msg.includes('rate_limited')) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      if (msg.includes('insufficient_watch_time')) return NextResponse.json({ error: 'Insufficient watch time' }, { status: 403 });
      if (msg.includes('video_not_found')) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      console.error('user_star RPC error:', rpcRes.error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const data = rpcRes.data as { starred: boolean; star_count: number } | null;
    if (!data) {
      console.error('user_star RPC returned no data:', rpcRes);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      starred: data.starred,
      star_count: data.star_count
    });
  } catch (err: any) {
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes('rate_limited')) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    if (msg.includes('insufficient_watch_time')) return NextResponse.json({ error: 'Insufficient watch time' }, { status: 403 });
    console.error('Unexpected error in star route:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
