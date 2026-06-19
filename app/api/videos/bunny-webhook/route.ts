import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createSupabaseAdminClient } from '@/../lib/supabase-server';

// -------- Bunny Stream status codes --------
const BUNNY_STATUS_FINISHED = 3;
const BUNNY_STATUS_FAILED = 5;

// -------- Signature verification --------
function verifySignature(rawBody: string, headers: Headers): boolean {
    const version   = headers.get('x-bunnystream-signature-version');
    const algorithm = headers.get('x-bunnystream-signature-algorithm');
    const signature = headers.get('x-bunnystream-signature');

    if (version !== 'v1' || algorithm !== 'hmac-sha256' || !signature)
        return false;

    const secret = process.env.BUNNY_STREAM_READ_ONLY_API_KEY!;
    const expected = createHmac('sha256', secret)
        .update(rawBody, 'utf8')
        .digest('hex');

    // timingSafeEqual requires same-length buffers, check length first
    if (signature.length !== expected.length)
        return false;

    return timingSafeEqual(
        Buffer.from(expected, 'utf8'),
        Buffer.from(signature, 'utf8'),
    );
}

export async function POST(request: Request) {
    // -------- Read raw body BEFORE any parsing --------
    // MUST use .text() here; if you .json() first, the raw bytes are gone
    // and the HMAC won't match.
    const rawBody = await request.text();

    if (!verifySignature(rawBody, request.headers))
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    let payload: { VideoLibraryId: number; VideoGuid: string; Status: number };
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { VideoGuid, Status } = payload;

    if (!VideoGuid)
        return NextResponse.json({ error: 'Missing VideoGuid' }, { status: 400 });

    // -------- Only act on terminal states --------
    if (Status !== BUNNY_STATUS_FINISHED && Status !== BUNNY_STATUS_FAILED) {
        // Acknowledge intermediate events (Queued, Processing, Encoding, etc.)
        // without doing anything - Bunny expects a 200 either way
        return NextResponse.json({ received: true });
    }

    const newStatus = Status === BUNNY_STATUS_FINISHED ? 'ready' : 'failed';

    try {
        const supabase = createSupabaseAdminClient();

        // -------- Match by GUID embedded in video_url --------
        // video_url looks like: https://<zone>.b-cdn.net/<guid>/playlist.m3u8
        const { error } = await supabase
            .from('videos')
            .update({ processing_status: newStatus, updated_at: new Date().toISOString() })
            .like('video_url', `%/${VideoGuid}/%`);

        if (error) {
            console.error('[bunny-webhook] Supabase update error:', error);
            // Still return 200 - the video row issue isn't Bunny's problem
            // and we don't want Bunny to retry indefinitely over a DB issue
            return NextResponse.json({ received: true });
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error('[bunny-webhook] Unexpected error:', err);
        return NextResponse.json({ received: true });
    }
}

// TODO: when ready for production, go to bunny.net and set the webhook URL to https://stellicast.com/api/videos/bunny-webhook