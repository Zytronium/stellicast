'use client';

import VideoPlayer from '@/components/VideoPlayer';

type EmbedVideo = {
  id: string;
  title: string;
  description?: string;
  thumbnail_url: string;
  // video_url is the HLS .m3u8 stream URL - VideoPlayer handles it via hls.js
  video_url: string;
  duration?: number;
  channels?: {
    display_name: string;
  };
};

export default function EmbedPlayer({ video }: { video: EmbedVideo }) {
  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      {/*
        VideoPlayer's getSrc() accepts video_url via its (v as any).video_url
        fallback, and getThumbnail() accepts thumbnail_url the same way,
        so no shape adaption is needed here.
      */}
      <VideoPlayer video={video} />
    </div>
  );
}
