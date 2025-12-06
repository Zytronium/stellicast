import Card from '@/components/Card'

// Mock data – replace with real API later
const videos = [
  {
    id: '1',
    title: 'Introducing Stellicast – The Future of Video',
    thumbnail: '/file.svg',
    creator: 'Stellicast Team',
  },
  // …add more mock entries
]

export default function HomePage() {
  return (
    <>
      <section className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Featured</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map(v => (
            <Card key={v.id} {...v} />
          ))}
        </div>
      </section>
    </>
  )
}