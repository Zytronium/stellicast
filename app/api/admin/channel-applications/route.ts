import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/../lib/supabase-server';
import { requireAdmin } from '@/../lib/admin';

export async function GET(req: NextRequest) {
    try {
        // -------- auth + admin check --------
        const supabase = await createSupabaseServerClient();
        const user = await requireAdmin(supabase);
        if (!user) {
            return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
        }

        // -------- admin client for DB reads (bypasses RLS) --------
        const admin = createSupabaseAdminClient();

        // -------- optional status filter --------
        const status = req.nextUrl.searchParams.get('status');

        let query = admin
            .from('channel_early_access_applications')
            .select(`
                id,
                user_id,
                status,
                content_type,
                upload_frequency,
                content_readiness,
                why_stellicast,
                other_platforms,
                how_heard,
                agreed_to_terms,
                channel_type,
                display_name,
                handle,
                description,
                website,
                company_name,
                business_email,
                reviewed_at,
                reviewer_note,
                submitted_at,
                users ( username, display_name, avatar_url )
            `)
            .order('submitted_at', { ascending: false });

        if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
            query = query.eq('status', status);
        }

        const { data: applications, error: queryError } = await query;

        if (queryError) {
            console.error('Application list query error:', queryError);
            return NextResponse.json({ error: 'Failed to load applications.' }, { status: 500 });
        }

        // -------- current channel count for the 30-slot cap --------
        const { count: channelCount, error: countError } = await admin
            .from('channels')
            .select('id', { count: 'exact', head: true });

        if (countError) {
            console.error('Channel count query error:', countError);
            return NextResponse.json({ error: 'Failed to load channel count.' }, { status: 500 });
        }

        return NextResponse.json({
            applications,
            channel_count: channelCount ?? 0,
            channel_cap: 30,
        });
    } catch (err) {
        console.error('Unexpected error in GET /api/admin/channel-applications:', err);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
