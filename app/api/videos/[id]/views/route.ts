import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const supabase = await createSupabaseServerClient();

    // Ensure video exists
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('view_count')
      .eq('id', id)
      .single();

    if (fetchError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Increment view_count
    const { data, error: updateError } = await supabase
      .from('videos')
      .update({ view_count: (video.view_count ?? 0) + 1 })
      .eq('id', id)
      .select('view_count')
      .single();

    if (updateError || !data) {
      return NextResponse.json({ error: 'Failed to update view count' }, { status: 500 });
    }

    // Return updated count
    return NextResponse.json({ view_count: data.view_count });
  } catch (err) {
    console.error('Error incrementing view count:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
