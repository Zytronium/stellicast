import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: videos, error } = await supabase
      .from('videos')
      .select('*, channels(display_name)')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ videos: videos || [] });
  } catch (error: any) {
    console.error('Video List API Error:', error);
    return NextResponse.json({ videos: [], error: error.message }, { status: 500 });
  }
}
