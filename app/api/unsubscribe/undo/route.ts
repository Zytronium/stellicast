import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { undoCache } from '../route';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Check if undo data exists
    const undoData = undoCache.get(token);

    if (!undoData) {
      return NextResponse.json({ error: 'Undo not available (expired or already used)' }, { status: 410 });
    }

    // Check if undo has expired (30 seconds)
    if (Date.now() - undoData.timestamp > 30000) {
      undoCache.delete(token);
      return NextResponse.json({ error: 'Undo expired' }, { status: 410 });
    }

    const supabase = await createSupabaseServerClient();

    // Restore previous preferences
    const { error: updateError } = await supabase
      .from('users')
      .update({ notification_preferences: undoData.previousPrefs })
      .eq('id', undoData.userId);

    if (updateError) {
      console.error('Failed to restore preferences:', updateError);
      return NextResponse.json({ error: 'Failed to restore preferences' }, { status: 500 });
    }

    // Remove from undo cache
    undoCache.delete(token);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Undo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
