import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // -------- Auth + ownership --------
    const { data: { user } } = await supabase.auth.getUser();
    if (!user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('id, video_url, channels(owner_id)')
        .eq('id', id)
        .single();

    if (videoError || !video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const channel = video.channels as unknown as { owner_id: string } | null;
    if (channel?.owner_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // -------- Parse and validate the uploaded file --------
    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('thumbnail') as File | null;
    if (!file)
        return NextResponse.json({ error: 'No thumbnail file provided' }, { status: 400 });

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
            { error: 'Invalid file type. Use JPEG, PNG, or WebP.' },
            { status: 400 }
        );
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
        return NextResponse.json({ error: 'Thumbnail must be under 5 MB.' }, { status: 400 });
    }

    // -------- Extract Bunny GUID from video_url --------
    // URL pattern: https://<pull-zone>/<guid>/playlist.m3u8
    const urlParts = (video.video_url ?? '').split('/');
    const guid = urlParts[urlParts.length - 2];
    if (!guid) {
        return NextResponse.json({ error: 'Could not determine video GUID' }, { status: 400 });
    }

    // -------- Push image bytes to Bunny --------
    const arrayBuffer = await file.arrayBuffer();

    const bunnyRes = await fetch(
        `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos/${guid}/thumbnail`,
        {
            method: 'POST',
            headers: {
                'AccessKey': process.env.BUNNY_STREAM_API_KEY!,
                'Content-Type': 'application/octet-stream',
            },
            body: arrayBuffer,
        }
    );

    if (!bunnyRes.ok) {
        const detail = await bunnyRes.text().catch(() => '');
        console.error('[thumbnail] Bunny error:', bunnyRes.status, detail);
        return NextResponse.json({ error: 'Failed to upload thumbnail to CDN' }, { status: 502 });
    }

    // -------- Fetch the thumbnail filename from Bunny --------
    // Bunny generates a unique filename per upload (i.e. thumbnail_0c3c56d1.jpg)
    // so we have to ask for it rather than assuming thumbnail.jpg.
    const fetchRes = await fetch(
        `https://video.bunnycdn.com/library/${process.env.BUNNY_STREAM_LIBRARY_ID}/videos/${guid}`,
        {
            headers: { 'AccessKey': process.env.BUNNY_STREAM_API_KEY! },
        }
    );

    if (!fetchRes.ok) {
        console.error('[thumbnail] Failed to fetch video metadata from Bunny:', fetchRes.status);
        return NextResponse.json({ error: 'Thumbnail uploaded but could not retrieve URL' }, { status: 502 });
    }

    const videoMeta = await fetchRes.json();
    const thumbnailFileName: string | undefined = videoMeta.thumbnailFileName;

    if (!thumbnailFileName) {
        console.error('[thumbnail] Bunny video metadata missing thumbnailFileName:', videoMeta);
        return NextResponse.json({ error: 'Thumbnail uploaded but filename not returned' }, { status: 502 });
    }

    const pullZone = process.env.BUNNY_PULL_ZONE_HOSTNAME;
    const newThumbnailUrl = `https://${pullZone}/${guid}/${thumbnailFileName}`;

    // Persist to DB
    const { error: dbError } = await supabase
        .from('videos')
        .update({ thumbnail_url: newThumbnailUrl, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (dbError) {
        console.error('[thumbnail] DB update error:', dbError);
        // The thumbnail is live on the CDN, the DB just didn't save the new URL.
        // Return the URL anyway so the client can show it, even if it doesn't persist on refresh.
        return NextResponse.json(
            { thumbnail_url: newThumbnailUrl, warning: 'DB update failed. Thumbnail may not persist' },
            { status: 207 }
        );
    }

    return NextResponse.json({ thumbnail_url: newThumbnailUrl });
}
