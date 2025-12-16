import { NextResponse } from 'next/server';

export type Video = {
  id: string;
  title: string;
  creator: string;
  description: string;
  thumbnail: string;
  src: string;
};

export const videos: Video[] = [
  {
    id: '1',
    title: 'Welcome to Stellicast - The future of video streaming',
    creator: 'The Stelli Cast',
    description: 'Placeholder description. This route is mocked for UI development.',
    thumbnail: '/StellicastPlaceholderThumbnail.png',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  },
  {
    id: '2',
    title: 'Star Trek Battle Engine: Defiant vs Jem\'Hadar',
    creator: 'Zytronium Dev Blogs',
    description:
      "Being a placeholder video for Stellicast development, this video features a fight in one of my previous web-based projects: Star Trek Battle Engine. It features a battle between the USS Defiant and a Jem'Hadar Fighter. Music: Undertale - Megalovania (1980s Synthwave Remix) by adolfobaez on YouTube. Yes, how ironic I got the music for this from YouTube.",
    thumbnail: '/StellicastPlaceholderThumbnail.png',
    src: 'https://share.zytronium.dev/videos/stellicast%20test/dev_test_1_STBE_Defiant_vs_Jem_Hadar.mp4',
  },
  {
    id: '3',
    title: 'Star Trek Battle Engine: Voyager vs Charon - The ultimate battle',
    creator: 'Zytronium Dev Blogs',
    description:
      "Being a placeholder video for Stellicast development, this video features a fight in one of my previous web-based projects: Star Trek Battle Engine. It features a battle between the USS Voyager and the ISS Charon, the Empress' throne ship in the Terran universe in Star Trek: Discovery. Music: Undertale - Bergentrückung/ASGORE (Synthwave Remix) by Mr. McNoggin on YouTube. Yes, how ironic I got the music for this from YouTube.",
    thumbnail: '/StellicastPlaceholderThumbnail.png',
    src: 'https://share.zytronium.dev/videos/stellicast%20test/dev_test_2_STBE_Voyager_vs_Charon.mp4',
  },
  {
    id: '4',
    title: 'Quick Tech Tips',
    creator: 'Creator Name',
    description: 'Placeholder description. This route is mocked for UI development.',
    thumbnail: '/StellicastAIPlaceholderThumbnail.png',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
];

export async function GET() {
  // Returns a simple list endpoint at /api/videos
  return NextResponse.json({ videos });
}
