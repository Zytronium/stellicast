'use client';

import { useState } from 'react';
import '@/globals.css';

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
  const [isPlaying, setIsPlaying] = useState(false);

  // Extract MP4 URL
  const videoGuid = video.video_url.split('/').slice(-2, -1)[0];
  const pullZone = process.env.BUNNY_PULL_ZONE_HOSTNAME;
  const mp4Url = `https://${pullZone}/${videoGuid}/play_720p.mp4`;

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      {!isPlaying ? (
        // Thumbnail with play button
        <div
          className="relative w-full h-full cursor-pointer group"
          onClick={() => setIsPlaying(true)}
        >
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-contain"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-50 transition">
            <svg
              className="w-20 h-20 text-white drop-shadow-lg"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      ) : (
        // Native video player
        <video
          className="w-full h-full"
          controls
          autoPlay
          src={mp4Url}
        >
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
}
