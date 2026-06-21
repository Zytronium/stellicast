import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/../lib/supabase-server';

export async function GET() {
    try {
        // -------- auth check --------
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'You must be signed in to view your applications.' }, { status: 401 });
        }

        // -------- admin client for DB reads --------
        const admin = createSupabaseAdminClient();

        const { data: applications, error: applicationsError } = await admin
            .from('channel_early_access_applications')
            .select('id, status, channel_type, display_name, handle, channel_id, submitted_at, reviewed_at, reviewer_note')
            .eq('user_id', user.id)
            .order('submitted_at', { ascending: false });

        if (applicationsError) {
            console.error('Applications lookup error:', applicationsError);
            return NextResponse.json({ error: 'Failed to load your applications.' }, { status: 500 });
        }

        return NextResponse.json({ applications: applications ?? [] });
    } catch (err) {
        console.error('Unexpected error in /api/account/applications:', err);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
