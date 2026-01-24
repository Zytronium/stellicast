import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

// Generate random 8-character slug using a-z, A-Z, 0-9 (x2), _, -
function generateSlug(): string {
  // 0-9 appears twice to make it x2 more likely to show up in a slug due to there being 52 a-z characters
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
  let slug = '';

  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// Generate unique slug by checking against existing videos
async function generateUniqueSlug(supabase: any): Promise<string> {
  let slug = generateSlug();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from('videos')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();

    if (error)
      throw error;

    // If no video with this slug exists, we're good
    if (!data) {
      return slug;
    }

    // Conflict detected, generate a new slug
    slug = generateSlug();
    attempts++;
  }

  throw new Error('Failed to generate unique slug after multiple attempts');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, channel_id } = body;

    if (!channel_id) {
      return NextResponse.json(
        { error: 'Channel ID is required. Please select a channel.' },
        { status: 400 }
      );
    }

    // Verify user owns this channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('id', channel_id)
      .eq('owner_id', user.id)
      .single();

    if (channelError || !channel) {
      return NextResponse.json(
        { error: 'Channel not found or you do not have permission' },
        { status: 403 }
      );
    }

    // Create video placeholder in Bunny Stream
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

    const pullZone = process.env.BUNNY_PULL_ZONE_HOSTNAME;

    // Generate unique slug for the video
    const slug = await generateUniqueSlug(supabase);

    // Store video metadata
    const { data: newVideo, error: dbError } = await supabase
      .from('videos')
      .insert({
        title: title || 'Untitled Video',
        description: body.description || '',
        thumbnail_url: `https://${pullZone}/${guid}/thumbnail.jpg`,
        video_url: `https://${pullZone}/${guid}/playlist.m3u8`,
        channel_id: channel_id,
        view_count: 0,
        duration: 0,
        visibility: body.visibility,
        is_ai: body.is_ai || false,
        is_promotional: body.is_promotional || false,
        tags: body.tags || [],
        slug: slug,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      guid,
      videoId: newVideo.id,
      slug: newVideo.slug,
      libraryId: process.env.BUNNY_STREAM_LIBRARY_ID,
      apiKey: process.env.BUNNY_STREAM_API_KEY,
    });
  } catch (error: any) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// todo: limit file size based on channel type and if user has premium
