'use client';

import Card from './components/Card';

const chips = ['All', 'Tech', 'Gaming', 'Music', 'Science', 'Podcasts', 'Live', 'New'];
const placeholder_titles = [
  "Welcome to Stellicast - The future of video streaming",
  "Star Trek Battle Engine: Defiant vs Jem’Hadar - A fitting battle",
  "Star Trek Battle Engine: Voyager vs Charon - The ultimate battle",
  "Quick Tech Tips",
  "Gaming Highlights: Best Moments of 2025",
  "The Science Behind Neural Networks and Machine Learning: A Deep Dive You Don't Want to Miss",
  "Weekend Music Mix",
  "Understanding Quantum Computing",
  "Live Podcast: Tech Talk",
  "Top 10 Gaming Moments",
  "The Art of Sound Design",
  "Scientific Breakthroughs 2025",
  "AI and the Future of Entertainment: A Comprehensive Analysis",
  "Quick Gaming Review",
  "Music Production Basics",
  "Live Coding Session: Building Modern Apps",
  "Podcast Episode 42: Digital Evolution",
  "Next-Gen Gaming Technologies Explained",
  "Behind the Scenes: Music Studio Tour",
  "Science Weekly Roundup"
];
export default function Home() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="pl-5 text-2xl font-semibold tracking-tight">Your Feed</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {chips.map((c, idx) => (
            <button
              key={c}
              className={
                idx === 0
                  ? 'rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm'
                  : 'rounded-full border border-gray-800 bg-[#0a0a0a] px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-900'
              }
              type="button"
            >
              {c}
            </button>
          ))}
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {placeholder_titles.map((title, i) => (
          <Card
            key={i}
            href={`/watch/${i + 1}`}
            duration="12:34"
            title={title}
            creator_name="Creator Name"
            views="2.1k views"
            date="2 days ago"
            thumbnail_src={(i - 4) % 7 === 0 ? "/StellicastAIPlaceholderThumbnail.png" : "/StellicastPlaceholderThumbnail.png"}
            is_ai={(i - 4) % 7 === 0}
          />
        ))}
      </section>
    </div>
  );
}