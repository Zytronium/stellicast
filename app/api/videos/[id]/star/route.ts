import { createSupabaseServerClient, createSupabaseAdminClient } from '@/../lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id: videoId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const watchedSeconds = typeof body?.watchedSeconds === 'number' ? Math.floor(body.watchedSeconds) : 0;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const adminClient = createSupabaseAdminClient();

    const { data: videoExists, error: videoErr } = await adminClient.from('videos').select('id').eq('id', videoId).single();
    if (videoErr || !videoExists) return json({ error: 'Video not found' }, 404);

    const rpcRes = await adminClient.rpc('user_star', { p_user: user.id, p_video: videoId, p_watched_seconds: watchedSeconds }).single();

    if (rpcRes.error) {
      const msg = String(rpcRes.error.message || rpcRes.error).toLowerCase();
      if (msg.includes('rate_limited')) return json({ error: 'Rate limit exceeded' }, 429);
      if (msg.includes('insufficient_watch_time')) return json({ error: 'Insufficient watch time' }, 403);
      if (msg.includes('video_not_found')) return json({ error: 'Video not found' }, 404);
      console.error('user_star RPC error:', rpcRes.error);
      return json({ error: 'Internal server error' }, 500);
    }

    const data = rpcRes.data as { starred: boolean; star_count: number } | null;
    if (!data) {
      console.error('user_star RPC returned no data:', rpcRes);
      return json({ error: 'Internal server error' }, 500);
    }

    return json({
      success: true,
      starred: data.starred,
      star_count: data.star_count
    });
  } catch (err: any) {
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes('rate_limited')) return json({ error: 'Rate limit exceeded' }, 429);
    if (msg.includes('insufficient_watch_time')) return json({ error: 'Insufficient watch time' }, 403);
    console.error('Unexpected error in star route:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}
