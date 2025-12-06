import { notFound } from 'next/navigation'
import Image from 'next/image'

type Params = { id: string }

async function fetchVideo(id: string) {
  // Placeholder – swap with your backend endpoint
  const res = await fetch(`${process.env.API_URL}/videos/${id}`)
  if (!res.ok) return null
  return res.json()
}

export default async function WatchPage({ params }: { params: Params }) {
  const video = await fetchVideo(params.id)
  if (!video) notFound()

  return (
    <article className="space-y-4">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        {/* Replace with actual video player (e.g., <video> or embed) */}
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className="object-cover"
        />
      </div>

      <h1 className="text-2xl font-bold">{video.title}</h1>
      <p className="text-gray-600">by {video.creator}</p>
      <section className="prose max-w-none">{video.description}</section>
    </article>
  )
}