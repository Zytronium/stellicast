import { notFound } from 'next/navigation';
import EmbedPlayer from './EmbedPlayer';

type Props = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function EmbedPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const videoRes = await fetch(`${baseUrl}/api/videos/${id}`, {
      cache: 'no-store'
    });

    if (!videoRes.ok) {
      notFound();
      return null;
    }

    const video = await videoRes.json();

    return <EmbedPlayer video={video} />;
  } catch (error) {
    notFound();
    return null;
  }
}