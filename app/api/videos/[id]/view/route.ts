import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const supabase = await createSupabaseServerClient();

    // First check if video exists
    const { data: videoExists, error: checkError } = await supabase
      .from('videos')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !videoExists) {
      console.error('Video not found:', id, checkError);
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Call the RPC function to atomically increment view count
    const { data, error } = await supabase
      .rpc('increment_video_view', { video_id: id });

    if (error) {
      console.error('Error incrementing view:', error);
      return NextResponse.json(
        { error: 'Failed to increment view' },
        { status: 500 }
      );
    }

    // Handle case where RPC returns empty array
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.error('RPC returned no data for video:', id);
      return NextResponse.json(
        { error: 'Failed to increment view' },
        { status: 500 }
      );
    }

    // RPC might return array or single object
    const result = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: true,
      view_count: result.view_count
    });
  } catch (error) {
    console.error('Error incrementing view:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
