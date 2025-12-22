import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;

  try {
    const supabase = await createSupabaseServerClient();

    // Fetch the video
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('view_count')
      .eq('id', id)
      .single();

    if (fetchError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Increment view count
    const { data, error: updateError } = await supabase
      .from('videos')
      .update({ view_count: (video.view_count ?? 0) + 1 })
      .eq('id', id)
      .select('view_count')
      .single();

    if (updateError || !data) {
      return NextResponse.json({ error: 'Failed to update view count' }, { status: 500 });
    }

    return NextResponse.json({ view_count: data.view_count });
  } catch (err) {
    console.error('Error incrementing view count:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
