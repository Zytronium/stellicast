import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/../lib/supabase-server';

export async function GET() {
    try {
        // -------- auth check --------
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ channels: [] }, { status: 401 });
        }

        // -------- admin client for DB reads (bypasses RLS) --------
        const admin = createSupabaseAdminClient();

        // -------- find this user's frozen channels --------
        const { data: channels, error: channelsError } = await admin
            .from('channels')
            .select('id, handle, display_name')
            .eq('owner_id', user.id)
            .eq('status', 'frozen');

        if (channelsError) {
            console.error('Frozen channels lookup error:', channelsError);
            return NextResponse.json({ error: 'Failed to load channels.' }, { status: 500 });
        }

        if (!channels || channels.length === 0) {
            return NextResponse.json({ channels: [] });
        }

        // -------- exclude channels that already have a pending application --------
        const channelIds = channels.map(channel => channel.id);

        const { data: pendingApps, error: pendingAppsError } = await admin
            .from('channel_early_access_applications')
            .select('channel_id')
            .in('channel_id', channelIds)
            .eq('status', 'pending');

        if (pendingAppsError) {
            console.error('Pending applications lookup error:', pendingAppsError);
            return NextResponse.json({ error: 'Failed to load channels.' }, { status: 500 });
        }

        const pendingChannelIds = new Set((pendingApps ?? []).map(app => app.channel_id));

        const eligibleChannels = channels.filter(channel => !pendingChannelIds.has(channel.id));

        return NextResponse.json({ channels: eligibleChannels });
    } catch (err) {
        console.error('Unexpected error in /api/account/channels/frozen:', err);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
