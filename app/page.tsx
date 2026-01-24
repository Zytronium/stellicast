'use client';

import { useState, useEffect } from 'react';
import Card from './components/Card';

const chips = ['All', 'Tech', 'Gaming', 'Music', 'Science', 'Podcasts', 'Live', 'New'];

export default function Home() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch('/api/videos');
        if (res.ok) {
          const data = await res.json();
          setVideos(data.videos || []);
        }
      } catch (error) {
        console.error('Failed to fetch videos:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="ml-1 text-2xl font-semibold tracking-tight">Your Feed</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {chips.map((c, idx) => (
            <button
              key={c}
              className={
                idx === 0
                  ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm'
                  : 'rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-card-foreground hover:bg-card'
              }
              type="button"
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-video bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : videos.length > 0 ? (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <Card
              key={video.id}
              slug={video.slug}
              duration={video.duration}
              title={video.title}
              creator_name={video.channels?.display_name || 'Unknown Creator'}
              views={video.view_count}
              date={video.created_at}
              thumbnail_src={video.thumbnail_url}
              is_ai={video.is_ai}
            />
          ))}
        </section>
      ) : (
        <div className="py-20 text-center">
          <p className="text-muted-foreground">No videos found. Be the first to upload!</p>
        </div>
      )}
    </div>
  );
}
