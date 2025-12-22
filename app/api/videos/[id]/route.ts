import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

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
          video_count
        )
      `)
    .eq('id', id)
    .single();

  if (error || !video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  return NextResponse.json(video);
}
