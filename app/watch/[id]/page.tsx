import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Card from '@/components/Card';

type Params = { id: string };
type Props = { params: Params | Promise<Params> };

type Video = {
  id: string;
  title: string;
  creator: string;
  description: string;
  thumbnail: string;
  src: string;
};

function makeAbsoluteUrl(pathname: string, h: Headers) {
  const host =
    h.get('x-forwarded-host') ??
    h.get('host') ??
    process.env.VERCEL_URL ??
    null;

  const proto = h.get('x-forwarded-proto') ?? 'http';

  if (!host) return null;
  return new URL(pathname, `${proto}://${host}`);
}

async function fetchVideoById(id: string) {
  const h = await headers();
  const url = makeAbsoluteUrl(`/api/videos/${id}`, h);
  if (!url) return null;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;

  return (await res.json()) as Video;
}

async function fetchAllVideos() {
  const h = await headers();
  const url = makeAbsoluteUrl(`/api/videos`, h);
  if (!url) return [];

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return [];

  const data = (await res.json()) as { videos?: Video[] };
  return Array.isArray(data.videos) ? data.videos : [];
}

function formatDescription(description: string) {
  // Keep it simple but readable; preserve line breaks if any exist.
  return description.split('\n').map((line, i) => (
    <p key={i} className={i === 0 ? '' : 'mt-3'}>
      {line}
    </p>
  ));
}

export default async function WatchPage({ params }: Props) {
  const { id } = await Promise.resolve(params);

  const video = await fetchVideoById(id);
  if (!video) notFound();

  const all = await fetchAllVideos();
  const upNext = all.filter((v) => v.id !== id).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-gray-300 hover:text-blue-400"
          aria-label="Back to feed"
        >
          ← Back
        </Link>

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-black">
            <div className="relative aspect-video">
              <video
                className="h-full w-full"
                controls
                playsInline
                preload="metadata"
                poster={video.thumbnail}
                src={video.src}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-xl font-semibold leading-snug sm:text-2xl">{video.title}</h1>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {video.creator?.[0]?.toUpperCase() ?? 'C'}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-100">{video.creator}</div>
                  <div className="text-xs text-gray-400">
                    {/* placeholders until API provides real stats */}
                    2.1k views • 2 days ago
                  </div>
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
                  {formatDescription(video.description)}
                </div>
              </details>
            </div>
          </div>
        </section>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-gray-800 bg-[#0a0a0a] p-4">
            <h2 className="text-sm font-semibold text-gray-100">Up next</h2>
            <p className="mt-1 text-xs text-gray-400">More videos (placeholder)</p>
          </div>

          <div className="grid gap-4">
            {upNext.map((v) => (
              <Card
                key={v.id}
                href={`/watch/${v.id}`}
                duration="12:34"
                title={v.title}
                creator_name={v.creator}
                views="2.1k views"
                date="2 days ago"
                thumbnail_src={v.thumbnail}
                is_ai={v.thumbnail.includes('AI')}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}