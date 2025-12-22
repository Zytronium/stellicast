// /app/watch/[id]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import WatchPageClient from './WatchPageClient';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

type Props = {
  params: { id: string } | Promise<{ id: string }>;
};

// -------------------------
// Metadata function
// -------------------------
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: video, error } = await supabase
      .from('videos')
      .select('*, channels(*)')
      .eq('id', id)
      .single();

    if (error || !video) return { title: 'Video Not Found - Stellicast' };

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const title = `${video.title} - Stellicast`;
    const description = video.description || `Watch ${video.title} on Stellicast`;
    const thumbnail = video.thumbnail_url;

    const videoGuid = (video.video_url || '').split('/').slice(-2, -1)[0] || '';
    const pullZone = process.env.BUNNY_PULL_ZONE_HOSTNAME || '';
    const mp4Url = pullZone
      ? `https://${pullZone}/${videoGuid}/play_720p.mp4`
      : `${video.video_url}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'video.other',
        url: `${baseUrl}/watch/${id}`,
        images: [{ url: thumbnail, width: 1280, height: 720, alt: video.title }],
        videos: [{ url: mp4Url, secureUrl: mp4Url, type: 'video/mp4', width: 1280, height: 720 }],
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
      },
    };
  } catch (err) {
    console.error('Error generating metadata:', err);
    return { title: 'Stellicast' };
  }
}

// -------------------------
// Server Component Page
// -------------------------
export default async function WatchPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  const supabase = await createSupabaseServerClient();
  const { data: video, error } = await supabase
    .from('videos')
    .select('*, channels(*)')
    .eq('id', id)
    .single();

  if (error || !video) notFound();

  // Render client-side component
  return <WatchPageClient initialVideo={video} />;
}
