import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

const VIEW_COOLDOWN_SECONDS = 60 * 30; // 30 minutes

export async function POST(
  request: Request,
  context: { params: { id: string } }
) {
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 });
  }

  const cookieName = `viewed_video_${id}`;
  const cookieStore = await cookies();

  // Check if user has viewed recently
  const hasViewed = !!cookieStore.get(cookieName);

  const supabase = await createSupabaseServerClient();

  if (hasViewed) {
    // Already viewed -> return current view_count
    const { data: existing, error: readErr } = await supabase
      .from('videos')
      .select('id, view_count')
      .eq('id', id)
      .single();

    if (readErr || !existing) {
      return NextResponse.json({ error: 'read_failed' }, { status: 500 });
    }

    return NextResponse.json({ view_count: existing.view_count });
  }

  // Not viewed recently -> increment
  let updatedRow: { id: string; view_count: number } | null = null;

  try {
    // Prefer RPC for atomic increment
    const { data, error } = await supabase.rpc('increment_video_view', { video_id: id }).single();
    if (error) throw error;
    updatedRow = data;
  } catch {
    // Fallback: standard update
    const { data: current, error: readErr } = await supabase
      .from('videos')
      .select('view_count')
      .eq('id', id)
      .single();
    if (readErr || !current) throw readErr || new Error('video_not_found');

    const newCount = (current.view_count ?? 0) + 1;
    const { data: finalRow, error: finalErr } = await supabase
      .from('videos')
      .update({ view_count: newCount })
      .eq('id', id)
      .select('id, view_count')
      .single();

    if (finalErr || !finalRow) throw finalErr || new Error('update_failed');
    updatedRow = finalRow;
  }

  // Set cooldown cookie (HTTP-only)
  cookieStore.set({
    name: cookieName,
    value: '1',
    maxAge: VIEW_COOLDOWN_SECONDS,
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });

  return NextResponse.json({ view_count: updatedRow?.view_count ?? null });
}
