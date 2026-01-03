import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { guid } = body;

    if (!guid) {
      return NextResponse.json(
        { error: 'Video GUID is required' },
        { status: 400 }
      );
    }

    // Verify the user owns the video before deleting
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, channel_id, channels!inner(owner_id)')
      .like('video_url', `%${guid}%`)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if the user owns the channel
    if ((video.channels as any).owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this video' },
        { status: 403 }
      );
    }

    // Delete video from Bunny Stream
    const deleteResponse = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos/${guid}`,
      {
        method: 'DELETE',
        headers: {
          'AccessKey': process.env.BUNNY_STREAM_API_KEY!,
        },
      }
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('Bunny.net deletion failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to delete video from Bunny.net', details: errorText },
        { status: deleteResponse.status }
      );
    }

    return NextResponse.json({ success: true, guid });
  } catch (error: any) {
    console.error('Delete Bunny API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
