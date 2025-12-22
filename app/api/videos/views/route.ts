import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

const VIEW_COOLDOWN_SECONDS = 60 * 30; // 30 minutes

function cookieHeaderHas(cookieHeader: string, name: string) {
  if (!cookieHeader) return false;
  return cookieHeader.split(';').map(s => s.trim().split('=')[0]).includes(name);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const cookieName = `viewed_video_${id}`;
  const cookieStore = cookies();
  let hasViewed = false;

  // defensive check for cookie existence across runtimes
  try {
    const maybeGet = (cookieStore as any).get;
    if (typeof maybeGet === 'function') {
      const c = cookieStore.get(cookieName);
      hasViewed = !!(c && (c as any).value);
    } else {
      const hdrs = headers() as any;
      const cookieHeader = hdrs && (typeof hdrs.get === 'function' ? hdrs.get('cookie') : (hdrs.cookie || hdrs['cookie'])) || '';
      hasViewed = cookieHeaderHas(cookieHeader, cookieName);
    }
  } catch (err) {
    const hdrs = headers() as any;
    const cookieHeader = hdrs && (typeof hdrs.get === 'function' ? hdrs.get('cookie') : (hdrs.cookie || hdrs['cookie'])) || '';
    hasViewed = cookieHeaderHas(cookieHeader, cookieName);
  }

  const supabase = await createSupabaseServerClient();

  // If already viewed: return current view_count (no increment)
  if (hasViewed) {
    const { data: existing, error: readErr } = await supabase
      .from('videos')
      .select('id, view_count')
      .eq('id', id)
      .single();

    if (readErr) {
      console.error('views route read error', readErr);
      return NextResponse.json({ error: 'read_failed' }, { status: 500 });
    }

    return NextResponse.json({ view_count: existing.view_count });
  }

  // Not viewed recently -> increment
  try {
    // Prefer RPC (atomic)
    let updated: any = null;

    try {
      const { data, error } = await supabase.rpc('increment_video_view', { video_id: id }).single();
      if (error) throw error;
      updated = data;
    } catch (rpcErr) {
      // Fallback: UPDATE ... RETURNING (attempt atomic update)
      const { data: resUpdate, error: updErr } = await supabase
        .from('videos')
        .update({ view_count: supabase.raw ? supabase.raw('view_count + 1') : undefined })
        .eq('id', id)
        .select('id, view_count')
        .single();

      // Note: many Supabase clients do not support raw() — if your client doesn't support it then use direct SQL RPC.
      if (updErr || !resUpdate) {
        // safe fallback: read row, then set new count
        const { data: current, error: readErr } = await supabase
          .from('videos')
          .select('id, view_count')
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

        if (finalErr) throw finalErr;
        updated = finalRow;
      } else {
        updated = resUpdate;
      }
    }

    // set the cooldown cookie (HTTP-only) in this route
    try {
      const setFn = (cookieStore as any).set;
      if (typeof setFn === 'function') {
        cookieStore.set({
          name: cookieName,
          value: '1',
          maxAge: VIEW_COOLDOWN_SECONDS,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
        });
      } else {
        // If .set not available, include Set-Cookie header manually
        const cookieVal = `${cookieName}=1; Max-Age=${VIEW_COOLDOWN_SECONDS}; Path=/; HttpOnly; SameSite=Lax`;
        const resp = NextResponse.json({ view_count: updated?.view_count ?? null });
        resp.headers.append('Set-Cookie', cookieVal);
        return resp;
      }
    } catch (err) {
      console.warn('Failed to set cookie via cookieStore.set()', err);
    }

    return NextResponse.json({ view_count: updated?.view_count ?? null });
  } catch (err) {
    console.error('views route increment error', err);
    return NextResponse.json({ error: 'increment_failed' }, { status: 500 });
  }
}
