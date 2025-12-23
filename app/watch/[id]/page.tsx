import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import WatchPageClient from './WatchPageClient';

type Props = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  try {
    // Fetch video data server-side for metadata
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const videoRes = await fetch(`${baseUrl}/api/videos/${id}`, {
      cache: 'no-store'
    });

    if (!videoRes.ok) {
      return {
        title: 'Video Not Found - Stellicast',
      };
    }

    const video = await videoRes.json();
    const title = `${video.title} - Stellicast`;
    const description = video.description || `Watch ${video.title} on Stellicast`;
    const thumbnail = video.thumbnail_url;

    // Extract GUID and use direct MP4 URL for embeds
    const videoGuid = video.video_url.split('/').slice(-2, -1)[0];
    const pullZone = process.env.BUNNY_PULL_ZONE_HOSTNAME;
    const mp4Url = `https://${pullZone}/${videoGuid}/play_720p.mp4`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'video.other',
        url: `${baseUrl}/watch/${id}`,
        images: [
          {
            url: thumbnail,
            width: 1280,
            height: 720,
            alt: video.title,
          },
        ],
        videos: [
          {
            url: mp4Url,
            secureUrl: mp4Url,
            type: 'video/mp4',
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
          playerUrl: `${baseUrl}/embed/${id}`,
          streamUrl: mp4Url,
          width: 1280,
          height: 720,
        },
      },
      other: {
        'og:video:type': 'video/mp4',
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
  return <WatchPageClient params={params} />;
}
