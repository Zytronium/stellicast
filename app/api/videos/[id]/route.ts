import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

const VIDEO_SELECT = `
        *,
        channels (
          id,
          display_name,
          handle,
          avatar_url,
          follower_count,
          video_count,
          owner_id
        ),
         sector_videos (
         sectors(name, slug)
         )
`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // -------- video lookup: UUID first, slug fallback --------
  let video: any = null;

  const { data: byId } = await supabase
    .from('videos')
    .select(VIDEO_SELECT)
    .eq('id', id)
    .single();

  if (byId) {
    video = byId;
  } else {
    const { data: bySlug } = await supabase
      .from('videos')
      .select(VIDEO_SELECT)
      .eq('slug', id)
      .single();

    video = bySlug ?? null;
  }

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // Check if user owns the channel
  const isOwner = user && video.channels?.owner_id === user.id;

  // If video is private and user doesn't own it, return 404
  if (video.visibility === 'private' && !isOwner) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  return NextResponse.json(video);
}
