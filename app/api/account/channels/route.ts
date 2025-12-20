import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all channels owned by this user
    const { data: channels, error } = await supabase
      .from('channels')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ channels: channels || [] });
  } catch (error: any) {
    console.error('Channels fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
