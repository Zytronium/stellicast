import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch the video with channel owner information
  const { data: video, error } = await supabase
    .from('videos')
    .select(`
        *,
        channels (
          id,
          display_name,
          handle,
          avatar_url,
          follower_count,
          video_count,
          owner_id
        )
      `)
    .eq('id', id)
    .single();

  if (error || !video) {
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
