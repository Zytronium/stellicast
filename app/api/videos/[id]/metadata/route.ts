import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { duration } = await request.json();
  const supabase = await createSupabaseServerClient();

  await supabase
    .from('videos')
    .update({ duration })
    .eq('id', id)
    // Only update if current duration is 0 to avoid unnecessary writes
    .eq('duration', 0);

  return NextResponse.json({ success: true });
}
