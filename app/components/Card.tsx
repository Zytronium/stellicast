import Image from 'next/image'
import Link from 'next/link'

type CardProps = {
  id: string
  title: string
  thumbnail: string
  creator: string
}

export default function Card({ id, title, thumbnail, creator }: CardProps) {
  return (
    <Link href={`/watch/${id}`} className="group block">
      <div className="relative aspect-video rounded-lg overflow-hidden mb-2 bg-gray-200">
        <Image
          src={thumbnail}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform"
        />
      </div>
      <h3 className="font-medium line-clamp-2">{title}</h3>
      <p className="text-sm text-gray-500">{creator}</p>
    </Link>
  )
}