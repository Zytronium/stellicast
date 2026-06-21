import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/../lib/supabase-server';

export async function POST(req: NextRequest) {
    try {
        // -------- auth check --------
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'You must be signed in to apply.' }, { status: 401 });
        }

        // -------- parse body --------
        const body = await req.json();
        const {
            // application fields
            content_type,
            upload_frequency,
            content_readiness,
            why_stellicast,
            other_platforms,
            how_heard,
            agreed_to_terms,
            // existing channel link (set when applying to unfreeze a channel the user already owns)
            channel_handle,
            // new channel fields (only used when channel_handle is not provided)
            channel_type,
            display_name,
            handle,
            description,
            website,
            company_name,
            business_email,
        } = body;

        const isExistingChannel = Boolean(channel_handle);

        // -------- shared validation --------
        if (!content_type?.trim() || !upload_frequency?.trim() || !content_readiness ||
            !other_platforms?.trim() || !how_heard?.trim()) {
            return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
        }

        if (!agreed_to_terms) {
            return NextResponse.json(
                { error: 'You must agree to the Channel Early Access Agreement.' },
                { status: 400 }
            );
        }

        if (!['ready', 'working', 'planning', 'no-plans'].includes(content_readiness)) {
            return NextResponse.json({ error: 'Invalid content readiness value.' }, { status: 400 });
        }

        // -------- admin client for DB reads/writes (bypasses RLS) --------
        const admin = createSupabaseAdminClient();

        // -------- check pending application cap (accepted/rejected don't count) --------
        const MAX_PENDING_APPLICATIONS = 3;

        const { count: pendingCount, error: pendingCountError } = await admin
            .from('channel_early_access_applications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'pending');

        if (pendingCountError) {
            console.error('Pending application count error:', pendingCountError);
            return NextResponse.json(
                { error: 'Failed to check your existing applications. Please try again.' },
                { status: 500 }
            );
        }

        if ((pendingCount ?? 0) >= MAX_PENDING_APPLICATIONS) {
            return NextResponse.json(
                { error: `You can only have ${MAX_PENDING_APPLICATIONS} pending applications at once. Wait for one to be reviewed before submitting another.` },
                { status: 409 }
            );
        }

        // ============================================================
        // ----- branch: applying to unfreeze an existing channel -----
        // ============================================================
        if (isExistingChannel) {
            const { data: existingChannel, error: channelLookupError } = await admin
                .from('channels')
                .select('id, owner_id, handle, display_name, channel_type, description, status')
                .eq('handle', channel_handle)
                .maybeSingle();

            if (channelLookupError) {
                console.error('Channel lookup error:', channelLookupError);
                return NextResponse.json(
                    { error: 'Failed to look up your channel. Please try again.' },
                    { status: 500 }
                );
            }

            if (!existingChannel) {
                return NextResponse.json({ error: 'Channel not found.' }, { status: 404 });
            }

            if (existingChannel.owner_id !== user.id) {
                return NextResponse.json(
                    { error: 'You do not have permission to apply for this channel.' },
                    { status: 403 }
                );
            }

            if (existingChannel.status === 'active') {
                return NextResponse.json(
                    { error: 'This channel is already active and does not need to apply for Early Access.' },
                    { status: 409 }
                );
            }

            // -------- pull type-specific fields from creators/studios (1:1 with channel_id) --------
            let website: string | null = null;
            let companyName: string | null = null;
            let businessEmail: string | null = null;

            if (existingChannel.channel_type === 'creator') {
                const { data: creatorRow, error: creatorLookupError } = await admin
                    .from('creators')
                    .select('website')
                    .eq('channel_id', existingChannel.id)
                    .maybeSingle();

                if (creatorLookupError) {
                    console.error('Creator lookup error:', creatorLookupError);
                    return NextResponse.json(
                        { error: 'Failed to look up your channel. Please try again.' },
                        { status: 500 }
                    );
                }

                website = creatorRow?.website ?? null;
            } else if (existingChannel.channel_type === 'studio') {
                const { data: studioRow, error: studioLookupError } = await admin
                    .from('studios')
                    .select('company_name, business_email')
                    .eq('channel_id', existingChannel.id)
                    .maybeSingle();

                if (studioLookupError) {
                    console.error('Studio lookup error:', studioLookupError);
                    return NextResponse.json(
                        { error: 'Failed to look up your channel. Please try again.' },
                        { status: 500 }
                    );
                }

                companyName = studioRow?.company_name ?? null;
                businessEmail = studioRow?.business_email ?? null;
            }

            const { data: pendingChannelApp } = await admin
                .from('channel_early_access_applications')
                .select('id')
                .eq('channel_id', existingChannel.id)
                .eq('status', 'pending')
                .maybeSingle();

            if (pendingChannelApp) {
                return NextResponse.json(
                    { error: 'This channel already has a pending application.' },
                    { status: 409 }
                );
            }

            const { error: insertError } = await admin
                .from('channel_early_access_applications')
                .insert({
                    user_id: user.id,
                    status: 'pending',
                    // application fields
                    content_type: content_type.trim(),
                    upload_frequency: upload_frequency.trim(),
                    content_readiness,
                    why_stellicast: why_stellicast?.trim() || null,
                    other_platforms: other_platforms.trim(),
                    how_heard: how_heard.trim(),
                    agreed_to_terms: true,
                    // existing channel link - pulled from the channel record, not user input
                    channel_id: existingChannel.id,
                    channel_type: existingChannel.channel_type,
                    display_name: existingChannel.display_name,
                    handle: existingChannel.handle,
                    description: existingChannel.description,
                    website,
                    company_name: companyName,
                    business_email: businessEmail,
                });

            if (insertError) {
                console.error('Application insert error:', insertError);
                return NextResponse.json(
                    { error: 'Failed to submit application. Please try again.' },
                    { status: 500 }
                );
            }

            // -------- notify admin & applicant --------
            try {
                const { error: notifyError } = await admin.functions.invoke('send-application-submitted', {
                    body: {
                        email: user.email,
                        displayName: existingChannel.display_name,
                        handle: existingChannel.handle,
                        channelType: existingChannel.channel_type,
                        isExistingChannel: true,
                        contentType: content_type.trim(),
                        uploadFrequency: upload_frequency.trim(),
                        contentReadiness: content_readiness,
                        otherPlatforms: other_platforms.trim(),
                        howHeard: how_heard.trim(),
                        whyStellicast: why_stellicast?.trim() || null,
                    },
                });

                if (notifyError) {
                    console.error('Failed to send application submitted notification:', notifyError);
                }
            } catch (notifyErr) {
                console.error('Unexpected error invoking send-application-submitted:', notifyErr);
            }

            return NextResponse.json({ success: true });
        }

        // ===========================================================
        // -------- branch: applying with a brand new channel --------
        // ===========================================================
        if (!display_name?.trim() || !handle?.trim()) {
            return NextResponse.json(
                { error: 'Channel display name and handle are required.' },
                { status: 400 }
            );
        }

        if (!['creator', 'studio'].includes(channel_type)) {
            return NextResponse.json({ error: 'Invalid channel type.' }, { status: 400 });
        }

        if (channel_type === 'studio' && !company_name?.trim()) {
            return NextResponse.json(
                { error: 'Company name is required for studio channels.' },
                { status: 400 }
            );
        }

        const cleanHandle = handle.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!cleanHandle) {
            return NextResponse.json({ error: 'Invalid channel handle.' }, { status: 400 });
        }

        // -------- check handle availability (existing channels + pending applications) --------
        const { data: existingHandle } = await admin
            .from('channels')
            .select('id')
            .eq('handle', cleanHandle)
            .maybeSingle();

        if (existingHandle) {
            return NextResponse.json(
                { error: 'That channel handle is already taken. Please choose another.' },
                { status: 409 }
            );
        }

        const { data: pendingHandleApp } = await admin
            .from('channel_early_access_applications')
            .select('id')
            .eq('handle', cleanHandle)
            .eq('status', 'pending')
            .maybeSingle();

        if (pendingHandleApp) {
            return NextResponse.json(
                { error: 'Another pending application is already using that handle. Please choose another.' },
                { status: 409 }
            );
        }

        // -------- insert application --------
        const { error: insertError } = await admin
            .from('channel_early_access_applications')
            .insert({
                user_id: user.id,
                status: 'pending',
                // application fields
                content_type: content_type.trim(),
                upload_frequency: upload_frequency.trim(),
                content_readiness,
                why_stellicast: why_stellicast?.trim() || null,
                other_platforms: other_platforms.trim(),
                how_heard: how_heard.trim(),
                agreed_to_terms: true,
                // channel fields - stored so channel can be created on acceptance
                channel_type,
                display_name: display_name.trim(),
                handle: cleanHandle,
                description: description?.trim() || null,
                website: website?.trim() || null,
                company_name: company_name?.trim() || null,
                business_email: business_email?.trim() || null,
            });

        if (insertError) {
            console.error('Application insert error:', insertError);
            return NextResponse.json(
                { error: 'Failed to submit application. Please try again.' },
                { status: 500 }
            );
        }

        // -------- notify admin & applicant --------
        try {
            const { error: notifyError } = await admin.functions.invoke('send-application-submitted', {
                body: {
                    email: user.email,
                    displayName: display_name.trim(),
                    handle: cleanHandle,
                    channelType: channel_type,
                    isExistingChannel: false,
                    contentType: content_type.trim(),
                    uploadFrequency: upload_frequency.trim(),
                    contentReadiness: content_readiness,
                    otherPlatforms: other_platforms.trim(),
                    howHeard: how_heard.trim(),
                    whyStellicast: why_stellicast?.trim() || null,
                },
            });

            if (notifyError) {
                console.error('Failed to send application submitted notification:', notifyError);
            }
        } catch (notifyErr) {
            console.error('Unexpected error invoking send-application-submitted:', notifyErr);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Unexpected error in /api/channels/apply:', err);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
