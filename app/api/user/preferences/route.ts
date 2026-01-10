import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();

    // Get current preferences
    const { data: userData } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const currentPreferences = userData?.preferences || {};

    // Merge updates with current preferences
    const newPreferences = { ...currentPreferences, ...updates };

    // Update the user's preferences
    const { error } = await supabase
      .from('users')
      .update({ preferences: newPreferences })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ success: true, preferences: newPreferences });
  } catch (error) {
    console.error('Error in preferences API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ preferences: userData?.preferences || {} });
  } catch (error) {
    console.error('Error in preferences API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
