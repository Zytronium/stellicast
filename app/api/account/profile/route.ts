import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile from public.users
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || user.email?.split('@')[0],
        display_name: profile?.display_name,
      },
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
