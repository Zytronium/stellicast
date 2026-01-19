import { createSupabaseServerClient, createSupabaseAdminClient } from '@/../lib/supabase-server';

type RouteContext = { params: Promise<{ id: string; commentId: string }> };

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id: videoId, commentId } = await context.params;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const admin = createSupabaseAdminClient();

    const { data: c, error: cErr } = await admin.from('comments').select('id, video_id').eq('id', commentId).single();
    if (cErr || !c) return json({ error: 'Comment not found' }, 404);
    if (c.video_id !== videoId) return json({ error: 'Comment does not belong to this video' }, 400);

    const rpcRes = await admin.rpc('user_comment_dislike', { p_user: user.id, p_comment: commentId }).single();

    if (rpcRes.error) {
      const msg = String(rpcRes.error.message || rpcRes.error).toLowerCase();
      if (msg.includes('rate_limited')) return json({ error: 'Rate limit exceeded' }, 429);
      if (msg.includes('comment_not_found')) return json({ error: 'Comment not found' }, 404);
      console.error('user_comment_dislike RPC error:', rpcRes.error);
      return json({ error: 'Internal server error' }, 500);
    }

    const data = rpcRes.data as { disliked: boolean; like_count: number; dislike_count: number } | null;
    if (!data) {
      console.error('user_comment_dislike returned no data:', rpcRes);
      return json({ error: 'Internal server error' }, 500);
    }

    return json({ success: true, disliked: data.disliked, like_count: data.like_count, dislike_count: data.dislike_count });
  } catch (err: any) {
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes('rate_limited')) return json({ error: 'Rate limit exceeded' }, 429);
    console.error('Unexpected error in comment dislike route:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}
