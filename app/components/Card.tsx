'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PlayIcon } from '@heroicons/react/24/solid';

type CardProps = {
  id: string;
  duration?: number | null;        // seconds
  title: string;
  creator_name: string;
  views?: number | null;
  date: string | Date;            // ISO string or Date
  thumbnail_src: string;
  is_ai: boolean;
};

function formatDuration(duration?: number | null): string {
  if (!duration || duration <= 0) return '0:00';
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatViews(views?: number | null): string {
  const v = views ?? 0;
  return `${v} view${v === 1 ? '' : 's'}`;
}

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

export default function Card({
  id,
  duration,
  title,
  creator_name,
  views,
  date,
  thumbnail_src,
  is_ai,
}: CardProps) {
  const [imgSrc, setImgSrc] = useState(thumbnail_src);

  return (
    <Link
      href={`/watch/${id}`}
      className="group block overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md border-border bg-card"
    >
      <div className="relative aspect-video bg-muted">
        <Image
          src={imgSrc}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onError={() => setImgSrc('/Stellicast404Thumbnail.png')}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr via-transparent opacity-0 transition-opacity group-hover:opacity-100 from-white/10 to-white/5" />

        {is_ai && (
          <div className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
            AI
          </div>
        )}

        <div className="absolute right-2 top-2 rounded-md bg-black/75 px-2 py-1 text-sm font-semibold text-white">
          {formatDuration(duration)}
        </div>

        <div
          className="pointer-events-none absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-white/10 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        >
          <PlayIcon className="h-6 w-6 text-accent-foreground/90" />
        </div>
      </div>

      <div className="space-y-2 p-4">
        <div className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
          {title}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-xs text-muted-foreground">
            {creator_name}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatViews(views)} • {formatDate(date)}
          </span>
        </div>
      </div>
    </Link>
  );
}
