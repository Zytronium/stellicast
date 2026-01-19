import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/../lib/supabase-server';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: videoId } = await context.params;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createSupabaseAdminClient();

    // Cheap existence check (return 404 early)
    const { data: videoExists, error: videoErr } = await adminClient
      .from('videos')
      .select('id')
      .eq('id', videoId)
      .single();

    if (videoErr || !videoExists) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

    // Call the DB RPC
    const rpcRes = await adminClient.rpc('user_dislike', { p_user: user.id, p_video: videoId }).single();

    if (rpcRes.error) {
      const msg = String(rpcRes.error.message || rpcRes.error).toLowerCase();
      if (msg.includes('rate_limited')) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      if (msg.includes('video_not_found')) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      if (msg.includes('select for update is not allowed')) {
        console.error('RPC config error:', rpcRes.error);
        return NextResponse.json({ error: 'Server misconfiguration: RPC must be VOLATILE' }, { status: 500 });
      }
      console.error('user_dislike RPC error:', rpcRes.error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const data = rpcRes.data as { disliked: boolean; like_count: number; dislike_count: number } | null;
    if (!data) {
      console.error('user_dislike RPC returned no data:', rpcRes);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      disliked: data.disliked,
      like_count: data.like_count,
      dislike_count: data.dislike_count
    });
  } catch (err: any) {
    const msg = String(err?.message || err).toLowerCase();
    if (msg.includes('rate_limited')) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    console.error('Unexpected error in dislike route:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
