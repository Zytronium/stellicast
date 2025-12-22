'use server';

import { cookies, headers } from 'next/headers';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

const VIEW_COOLDOWN_SECONDS = 60 * 30; // 30 minutes

export async function incrementViewAction(id: string) {
  if (!id) return null;

  const cookieStore = await cookies();
  const viewCookieName = `viewed_video_${id}`;

  // --- determine if cookie exists (defensive across runtimes) ---
  let hasViewed = false;

  try {
    // Prefer cookieStore.get() when available
    const maybeGet = (cookieStore as any).get;
    if (typeof maybeGet === 'function') {
      const c = cookieStore.get(viewCookieName);
      hasViewed = !!(c && (c as any).value);
    } else {
      // Fallback: try headers()
      const hdrs = headers() as any;
      let cookieHeader = '';

      if (hdrs) {
        if (typeof hdrs.get === 'function') {
          cookieHeader = hdrs.get('cookie') || '';
        } else {
          // headers() may be a plain object in some runtimes
          cookieHeader = hdrs['cookie'] || hdrs.cookie || '';
        }
      }

      if (cookieHeader) {
        const keys = cookieHeader.split(';').map((s: string) => s.trim().split('=')[0]);
        hasViewed = keys.includes(viewCookieName);
      } else {
        hasViewed = false;
      }
    }
  } catch (err) {
    // Very defensive fallback: parse headers() raw if possible
    try {
      const hdrs = headers() as any;
      const cookieHeader = (hdrs && (typeof hdrs.get === 'function' ? hdrs.get('cookie') : hdrs['cookie'])) || '';
      const keys = cookieHeader.split(';').map((s: string) => s.trim().split('=')[0]);
      hasViewed = keys.includes(viewCookieName);
    } catch (_e) {
      hasViewed = false;
    }
  }

  const supabase = await createSupabaseServerClient();

  if (hasViewed) {
    // Already viewed in this browser: return minimal existing row (no increment)
    const { data: existing, error: readErr } = await supabase
      .from('videos')
      .select('id, view_count')
      .eq('id', id)
      .single();

    if (readErr) {
      console.error('incrementViewAction read error', readErr);
      return null;
    }
    return existing;
  }

  // Not viewed recently — increment via RPC (atomic)
  try {
    const { data, error } = await supabase.rpc('increment_video_view', { video_id: id }).single();
    if (error) {
      console.error('incrementViewAction rpc error', error);
      return null;
    }

    // Try to set the cookie (HTTP-only). cookieStore.set should exist in server actions.
    try {
      const maybeSet = (cookieStore as any).set;
      if (typeof maybeSet === 'function') {
        cookieStore.set({
          name: viewCookieName,
          value: '1',
          maxAge: VIEW_COOLDOWN_SECONDS,
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
        });
      } else {
        console.warn('cookieStore.set is not available in this runtime; cooldown cookie not set');
      }
    } catch (err) {
      console.warn('Failed to set cookieStore.set()', err);
    }

    return data;
  } catch (err) {
    console.error('incrementViewAction unexpected error', err);
    return null;
  }
}
