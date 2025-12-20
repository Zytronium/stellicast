'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import VideoPlayer, { type Video } from '@/components/VideoPlayer';

export default function WatchPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const [video, setVideo] = useState<Video | null>(null);
  const [upNext, setUpNext] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await Promise.resolve(params);
      const { id } = resolvedParams;

      try {
        // Fetch current video
        const videoRes = await fetch(`/api/videos/${id}`);
        if (!videoRes.ok) {
          notFound();
          return;
        }
        const videoData = await videoRes.json();
        setVideo(videoData);

        // Fetch all videos for up next
        const allRes = await fetch(`/api/videos`);
        if (allRes.ok) {
          const allData = await allRes.json();
          const videos = Array.isArray(allData.videos) ? allData.videos : [];
          setUpNext(videos.filter((v: Video) => v.id !== id).slice(0, 8));
        }
      } catch (error) {
        console.error('Error loading video:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!video) {
    notFound();
    return null;
  }

  return (
    <div className="flex gap-6 max-w-[1800px] mx-auto">
      {/* Left side: Video Player and Info */}
      <div className="flex-1 min-w-0">
        {/* Video Player */}
        <VideoPlayer video={video} />

        {/* Video Info Section */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <a
                href={video.src}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
              >
                Open source URL
              </a>
              <Link
                href={`/watch/${video.id}`}
                className="rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-900"
              >
                Permalink
              </Link>
            </div>
          </div>

          <h1 className="text-2xl font-semibold">{video.title}</h1>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {video.creator?.[0]?.toUpperCase() ?? 'C'}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-100">{video.creator}</div>
                <div className="text-xs text-gray-400">2.1k views • 2 days ago</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Follow
              </button>
              <button
                type="button"
                className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-2 text-sm text-gray-100 hover:bg-gray-800"
              >
                Like
              </button>
              <button
                type="button"
                className="rounded-xl border border-gray-800 bg-[#0a0a0a] px-4 py-2 text-sm text-gray-100 hover:bg-gray-900"
              >
                Share
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#0a0a0a] p-4">
            <details open className="group">
              <summary className="cursor-pointer list-none text-sm font-semibold text-gray-100">
                Description
                <span className="ml-2 text-xs font-normal text-gray-400 group-open:hidden">
                  (click to expand)
                </span>
              </summary>
              <div className="mt-3 text-sm leading-relaxed text-gray-300">
                {video.description.split('\n').map((line, i) => (
                  <p key={i} className={i === 0 ? '' : 'mt-3'}>
                    {line}
                  </p>
                ))}
              </div>
            </details>
          </div>
        </div>

        {/* Continued Feed Below */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">More Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upNext.map((v) => (
              <Link key={v.id} href={`/watch/${v.id}`} className="bg-gray-900/50 rounded-lg overflow-hidden hover:bg-gray-900 transition">
                <div className="aspect-video bg-gray-800 relative">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium line-clamp-2">{v.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{v.creator} • 2.1k views</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Comments */}
      <div className="w-96 bg-gray-900/50 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Comments</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0"></div>
            <div className="flex-1">
              <p className="text-sm font-medium">User Name</p>
              <p className="text-sm text-gray-300 mt-1">This is a placeholder comment. Comments functionality to be implemented.</p>
              <div className="flex gap-3 mt-2 text-xs text-gray-400">
                <button className="hover:text-white">Like</button>
                <button className="hover:text-white">Reply</button>
                <span>2 days ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}