import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('video') as File;
    const title = formData.get('title') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create video in Bunny Stream
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos`,
      {
        method: 'POST',
        headers: {
          'AccessKey': process.env.BUNNY_STREAM_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || file.name,
        }),
      }
    );

    const video = await createResponse.json();
    const videoId = video.guid;

    // Upload video file
    const fileBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch(
      `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
      {
        method: 'PUT',
        headers: {
          'AccessKey': process.env.BUNNY_STREAM_API_KEY!,
        },
        body: fileBuffer,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error('Upload failed');
    }

    return NextResponse.json({
      success: true,
      videoId,
      video,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
// todo: limit uploads to logged in users
// todo: when channels are implemented, limit uploads to channels
// todo: limit file size based on channel type and if user has premium
// todo: store video metadata in supabase database
