import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import WatchPageClient from './WatchPageClient';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

type Props = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  const supabase = await createSupabaseServerClient();

  if (id === 'pong') {
    const title = `Pong - Stellicast`;
    const description = `Pong on Stellicast`;

    return {
      title,
      description
    };
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  // Try to find video by slug first
  // eslint-disable-next-line prefer-const
  let { data: video, error } = await supabase
    .from('videos')
    .select('id, slug, visibility, channels(owner_id)')
    .eq('slug', id)
    .single();

  // If not found by slug, try by UUID
  if (error || !video) {
    const { data: videoById, error: idError } = await supabase
      .from('videos')
      .select('id, slug, visibility, channels(owner_id)')
      .eq('id', id)
      .single();

    if (idError || !videoById) {
      return {
        title: 'Video Not Found - Stellicast',
      };
    }

    video = videoById;
  }

  // Check if video is private and user is not the owner
  const channels = video.channels as any;
  const channelOwnerId = Array.isArray(channels) ? channels[0]?.owner_id : channels?.owner_id;
  const isOwner = currentUserId && channelOwnerId === currentUserId;
  if (video.visibility === 'private' && !isOwner) {
    return {
      title: 'Video Not Found - Stellicast',
    };
  }

  const videoId = video.id;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const videoRes = await fetch(`${baseUrl}/api/videos/${videoId}`, {
      cache: 'no-store'
    });

    if (!videoRes.ok) {
      return {
        title: 'Video Not Found - Stellicast',
      };
    }

    const videoData = await videoRes.json();
    const title = `${videoData.title} - Stellicast`;
    const description = videoData.description || `Watch ${videoData.title} on Stellicast`;
    const thumbnail = videoData.thumbnail_url;

    const embedUrl = `${baseUrl}/embed/${video.slug}`;
    const videoGuid = videoData.video_url.split('/').slice(-2, -1)[0];
    const pullZone = process.env.BUNNY_PULL_ZONE_HOSTNAME;
    const mp4Url = `https://${pullZone}/${videoGuid}/play_720p.mp4`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'video.other',
        url: `${baseUrl}/watch/${video.slug}`,
        images: [
          {
            url: thumbnail,
            width: 1280,
            height: 720,
            alt: videoData.title,
          },
        ],
        videos: [
          {
            url: embedUrl,
            secureUrl: embedUrl,
            type: 'text/html',
            width: 1280,
            height: 720,
          },
        ],
        siteName: 'Stellicast',
      },
      twitter: {
        card: 'player',
        title,
        description,
        images: [thumbnail],
        players: {
          playerUrl: embedUrl,
          streamUrl: mp4Url,
          width: 1280,
          height: 720,
        },
      },
      other: {
        'og:video:type': 'text/html',
        'og:video:width': '1280',
        'og:video:height': '720',
        'twitter:player:width': '1280',
        'twitter:player:height': '720',
        'theme-color': '#0092f3',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Stellicast',
    };
  }
}

export default async function WatchPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;
  const supabase = await createSupabaseServerClient();

  if (id === 'pong') {
    return <WatchPageClient params={params} />;
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  // Try to find video by slug first
  const { data: videoBySlug, error: slugError } = await supabase
    .from('videos')
    .select('id, slug, visibility, channels(owner_id)')
    .eq('slug', id)
    .single();

  // If found by slug, check visibility
  if (videoBySlug && !slugError) {
    // Check if video is private and user is not the owner
    const channels = videoBySlug.channels as any;
    const channelOwnerId = Array.isArray(channels) ? channels[0]?.owner_id : channels?.owner_id;
    const isOwner = currentUserId && channelOwnerId === currentUserId;
    if (videoBySlug.visibility === 'private' && !isOwner) {
      notFound();
    }
    return <WatchPageClient params={params} />;
  }

  // Not found by slug - try by UUID
  const { data: videoById, error: idError } = await supabase
    .from('videos')
    .select('id, slug, visibility, channels(owner_id)')
    .eq('id', id)
    .single();

  // If not found by UUID either, show 404
  if (idError || !videoById) {
    notFound();
  }

  // Check if video is private and user is not the owner
  const channels = videoById.channels as any;
  const channelOwnerId = Array.isArray(channels) ? channels[0]?.owner_id : channels?.owner_id;
  const isOwner = currentUserId && channelOwnerId === currentUserId;
  if (videoById.visibility === 'private' && !isOwner) {
    notFound();
  }

  // Found by UUID - redirect to slug-based URL
  redirect(`/watch/${videoById.slug}`);
}