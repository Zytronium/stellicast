import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/../lib/supabase-server';
import { requireAdmin } from '@/../lib/admin';
import { notifyApplicationDecision } from '@/../lib/notifications';

const CHANNEL_CAP = 30;

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // -------- auth + admin check --------
        const supabase = await createSupabaseServerClient();
        const adminUser = await requireAdmin(supabase);
        if (!adminUser) {
            return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
        }

        const { id } = await params;

        // -------- parse body --------
        const body = await req.json();
        const { action, note } = body as { action: 'approve' | 'reject'; note?: string };

        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
        }

        // -------- admin client for DB reads/writes (bypasses RLS) --------
        const admin = createSupabaseAdminClient();

        // -------- load the application --------
        const { data: application, error: fetchError } = await admin
            .from('channel_early_access_applications')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (fetchError || !application) {
            return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
        }

        if (application.status !== 'pending') {
            return NextResponse.json(
                { error: 'This application has already been reviewed.' },
                { status: 409 }
            );
        }

        // -------- reject path --------
        if (action === 'reject') {
            const { error: updateError } = await admin
                .from('channel_early_access_applications')
                .update({
                    status: 'rejected',
                    reviewed_at: new Date().toISOString(),
                    reviewer_note: note?.trim() || null,
                })
                .eq('id', id);

            if (updateError) {
                console.error('Application reject error:', updateError);
                return NextResponse.json({ error: 'Failed to reject application.' }, { status: 500 });
            }

            // -------- room for email notification --------
            // TODO: actually send the email once that infrastructure exists
            await notifyApplicationDecision({
                userId: application.user_id,
                status: 'rejected',
                displayName: application.display_name,
                note: note?.trim() || null,
            });

            return NextResponse.json({ success: true });
        }

        // -------- approve path --------

        // -------- enforce the channel cap --------
        const { count: channelCount, error: countError } = await admin
            .from('channels')
            .select('id', { count: 'exact', head: true });

        if (countError) {
            console.error('Channel count query error:', countError);
            return NextResponse.json({ error: 'Failed to check channel capacity.' }, { status: 500 });
        }

        if ((channelCount ?? 0) >= CHANNEL_CAP) {
            return NextResponse.json(
                { error: `Channel cap reached (${CHANNEL_CAP}/${CHANNEL_CAP}). Approve fewer or remove inactive channels first.` },
                { status: 409 }
            );
        }

        // -------- re-check handle availability (it may have been taken since the application was submitted) --------
        const { data: existingHandle } = await admin
            .from('channels')
            .select('id')
            .eq('handle', application.handle)
            .maybeSingle();

        if (existingHandle) {
            return NextResponse.json(
                { error: 'That handle was taken by another channel since this application was submitted.' },
                { status: 409 }
            );
        }

        // -------- create the channel --------
        const { data: newChannel, error: channelError } = await admin
            .from('channels')
            .insert({
                owner_id: application.user_id,
                channel_type: application.channel_type,
                display_name: application.display_name,
                handle: application.handle,
                description: application.description,
            })
            .select('id')
            .single();

        if (channelError || !newChannel) {
            console.error('Channel creation error:', channelError);
            return NextResponse.json({ error: 'Failed to create channel.' }, { status: 500 });
        }

        // -------- create the type-specific row --------
        if (application.channel_type === 'creator') {
            const { error: creatorError } = await admin
                .from('creators')
                .insert({
                    channel_id: newChannel.id,
                    website: application.website,
                });

            if (creatorError) {
                console.error('Creator row creation error:', creatorError);
                // -------- best-effort rollback --------
                await admin.from('channels').delete().eq('id', newChannel.id);
                return NextResponse.json({ error: 'Failed to create creator profile.' }, { status: 500 });
            }
        } else {
            const { error: studioError } = await admin
                .from('studios')
                .insert({
                    channel_id: newChannel.id,
                    company_name: application.company_name,
                    business_email: application.business_email,
                });

            if (studioError) {
                console.error('Studio row creation error:', studioError);
                // -------- best-effort rollback --------
                await admin.from('channels').delete().eq('id', newChannel.id);
                return NextResponse.json({ error: 'Failed to create studio profile.' }, { status: 500 });
            }
        }

        // -------- mark the application as accepted --------
        const { error: updateError } = await admin
            .from('channel_early_access_applications')
            .update({
                status: 'accepted',
                reviewed_at: new Date().toISOString(),
                reviewer_note: note?.trim() || null,
            })
            .eq('id', id);

        if (updateError) {
            console.error('Application accept error:', updateError);
            return NextResponse.json({ error: 'Channel was created, but failed to update application status.' }, { status: 500 });
        }

        // -------- room for email notification --------
        // TODO: actually send the email once that infrastructure exists
        await notifyApplicationDecision({
            userId: application.user_id,
            status: 'accepted',
            displayName: application.display_name,
            note: note?.trim() || null,
        });

        return NextResponse.json({ success: true, channel_id: newChannel.id });
    } catch (err) {
        console.error('Unexpected error in PATCH /api/admin/channel-applications/[id]:', err);
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
