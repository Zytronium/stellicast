import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Ensure public.users record exists
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      await supabase.from('users').insert({
        id: user.id,
        username: user.email?.split('@')[0] || `user_${user.id.slice(0, 5)}`,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      });
    }

    // 2. Ensure the user has a channel (Test Channel Logic)
    let { data: channel } = await supabase
      .from('channels')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!channel) {
      const { data: newChannel, error: createError } = await supabase
        .from('channels')
        .insert({
          owner_id: user.id,
          display_name: `${user.email?.split('@')[0]}'s Channel`,
          handle: `user_${user.id.slice(0, 8)}`,
          channel_type: 'creator',
        })
        .select()
        .single();

      if (createError) throw createError;
      channel = newChannel;
    }

    const body = await request.json();
    const { title } = body;

    // 3. Create video placeholder in Bunny Stream
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': process.env.BUNNY_STREAM_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: title || 'Untitled Video' }),
      }
    );

    if (!createResponse.ok) throw new Error('Bunny Stream initialization failed');
    const videoData = await createResponse.json();
    const guid = videoData.guid;
    
    // Use the Pull Zone for public URLs, not the API host
    const pullZone = process.env.BUNNY_PULL_ZONE_HOSTNAME;
    
    // 4. Store video metadata
    const { data: newVideo, error: dbError } = await supabase
      .from('videos')
      .insert({
        title: title || 'Untitled Video',
        description: body.description || '',
        thumbnail_url: `https://${pullZone}/${guid}/thumbnail.jpg`,
        video_url: `https://${pullZone}/${guid}/playlist.m3u8`,
        channel_id: channel.id,
        view_count: 0,
        duration: 0,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      guid,
      videoId: newVideo.id,
      libraryId: process.env.BUNNY_STREAM_LIBRARY_ID,
      apiKey: process.env.BUNNY_STREAM_API_KEY,
    });
  } catch (error: any) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// todo: when channels are implemented, limit uploads to channels
// todo: limit file size based on channel type and if user has premium
// todo: store video metadata in supabase database
