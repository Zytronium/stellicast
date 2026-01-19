import { createSupabaseServerClient, createSupabaseAdminClient } from '@/../lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id: videoId } = await context.params;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const adminClient = createSupabaseAdminClient();

    // Existence check
    const { data: videoExists, error: videoErr } = await adminClient.from('videos').select('id').eq('id', videoId).single();
    if (videoErr || !videoExists) return json({ error: 'Video not found' }, 404);

    const rpcRes = await adminClient.rpc('user_like', { p_user: user.id, p_video: videoId }).single();

    if (rpcRes.error) {
      const msg = String(rpcRes.error.message || rpcRes.error).toLowerCase();
      if (msg.includes('rate_limited')) return json({ error: 'Rate limit exceeded' }, 429);
      if (msg.includes('video_not_found')) return json({ error: 'Video not found' }, 404);
      console.error('user_like RPC error:', rpcRes.error);
      return json({ error: 'Internal server error' }, 500);
    }

    const data = rpcRes.data as { liked: boolean; like_count: number; dislike_count: number } | null;
    if (!data) {
      console.error('user_like RPC returned no data:', rpcRes);
      return json({ error: 'Internal server error' }, 500);
    }

    return json({
      success: true,
      liked: data.liked,
      like_count: data.like_count,
      dislike_count: data.dislike_count
    });
  } catch (err: any) {
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes('rate_limited')) return json({ error: 'Rate limit exceeded' }, 429);
    console.error('Unexpected error in like route:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}
