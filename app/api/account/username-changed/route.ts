import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get username changes in the last 24 hours
    const { data: changes, error } = await supabase
      .from('username_change_history')
      .select('*')
      .eq('user_id', user.id)
      .gte('changed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('changed_at', { ascending: false });

    if (error) {
      console.error('Error fetching username changes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const changesUsed = changes?.length || 0;
    const changesRemaining = Math.max(0, 3 - changesUsed);
    const canChange = changesRemaining > 0;

    // Calculate when they can change again if at limit
    let nextChangeAvailable = null;
    if (!canChange && changes && changes.length > 0) {
      const oldestChange = changes[changes.length - 1];
      nextChangeAvailable = new Date(
        new Date(oldestChange.changed_at).getTime() + 24 * 60 * 60 * 1000
      ).toISOString();
    }

    return NextResponse.json({
      canChange,
      changesUsed,
      changesRemaining,
      nextChangeAvailable,
      recentChanges: changes?.map(c => ({
        oldUsername: c.old_username,
        newUsername: c.new_username,
        changedAt: c.changed_at
      })) || []
    });
  } catch (error: any) {
    console.error('Username changes check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
