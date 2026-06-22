import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sectors = searchParams.getAll('sectors'); // i.e. `?sectors=tech&sectors=science`

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('videos')
      .select('*, channels(display_name, avatar_url), sector_videos(sectors(name, slug))')
      .eq('visibility', 'public')
      .eq('processing_status', 'ready')
      .order('created_at', { ascending: false });

    if (sectors.length > 0) {
      const { data: sectorRows, error: sectorError } = await supabase
        .from('sectors')
        .select('id')
        .in('slug', sectors);

      if (sectorError)
          throw sectorError;

      const sectorIds = sectorRows?.map(s => s.id) ?? [];

      // Only surface videos that have been approved in the requested sectors
      const { data: svRows, error: svError } = await supabase
        .from('sector_videos')
        .select('video_id')
        .in('sector_id', sectorIds)
        .eq('approval_status', 'approved');

      if (svError) throw svError;

      const videoIds = [...new Set(svRows?.map(sv => sv.video_id) ?? [])];

      if (videoIds.length === 0) {
        return NextResponse.json({ videos: [] });
      }

      query = query.in('id', videoIds);
    }

    const { data: videos, error } = await query;

    if (error)
        throw error;

    return NextResponse.json({ videos: videos || [] });
  } catch (error: any) {
    console.error('Video List API Error:', error);
    return NextResponse.json({ videos: [], error: error.message }, { status: 500 });
  }
}
