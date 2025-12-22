'use client';

import { useState, useEffect } from 'react';
import VideoPlayer from '@/components/VideoPlayer';
import '@/app/globals.css';

type Video = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  duration?: number;
  channels?: {
    display_name: string;
  };
};

export default function EmbedPlayer({ video }: { video: Video }) {
  const [useCustomPlayer, setUseCustomPlayer] = useState(true);

  useEffect(() => {
    // Detect if we're in an embedded context that might not support custom player
    const userAgent = navigator.userAgent.toLowerCase();
    const isDiscord = userAgent.includes('discord');
    const isTwitter = userAgent.includes('twitter');

    // Use simple player for platforms that might have issues
    if (isDiscord || isTwitter) {
      setUseCustomPlayer(false);
    }
  }, []);

  const videoData = {
    id: video.id,
    title: video.title,
    creator: video.channels?.display_name || 'Unknown Creator',
    description: video.description || '',
    thumbnail: video.thumbnail_url,
    src: video.video_url,
    duration: video.duration,
  };

  // Extract MP4 URL for fallback
  const videoGuid = video.video_url.split('/').slice(-2, -1)[0];
  const pullZone = process.env.BUNNY_PULL_ZONE_HOSTNAME;
  const mp4Url = `https://${pullZone}/${videoGuid}/play_720p.mp4`;

  return (
    <html lang="en">
    <head>
      <title>{video.title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style={{ margin: 0, padding: 0, backgroundColor: '#000', overflow: 'hidden' }}>
    <div style={{ width: '100vw', height: '100vh' }}>
      {useCustomPlayer ? (
        <VideoPlayer video={videoData} />
      ) : (
        <video
          controls
          autoPlay
          playsInline
          preload="auto"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          src={mp4Url}
          poster={video.thumbnail_url}
        >
          Your browser does not support the video tag.
        </video>
      )}
    </div>
    </body>
    </html>
  );
}
