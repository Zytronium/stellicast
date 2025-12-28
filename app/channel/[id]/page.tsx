import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Card from "@/components/Card";

type PageParams = {
  id: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function ChannelPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: channel, error } = await supabase
    .from('channels')
    .select('*')
    .eq('handle', id)
    .single();

  if (error || !channel) {
    notFound();
  }

  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .eq('channel_id', channel.id)
    .order('created_at', { ascending: false });


  return (
    <div className="relative">
      <div className="w-full h-48 relative">
        {channel.banner_url ? (
          <Image
            src={channel.banner_url}
            alt={`${channel.name}'s banner`}
            fill
            className="object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>

      <div className="container mx-auto px-4">
        <div className="relative -mt-16">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-blue-950 relative">
            {channel.avatar_url ? (
              <Image
                src={channel.avatar_url}
                alt={`${channel.name}'s profile picture`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-300" />
            )}
          </div>
          <h1 className="text-2xl font-bold mt-4">{channel.name}</h1>
          {channel.description && (
            <p className="mt-2 text-gray-600">{channel.description}</p>
          )}
        </div>
        <div className="flex flex-row gap-40 mt-6">
          <p
            className="relative cursor-pointer font-bold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-blue-100 after:transition-transform after:duration-200 hover:after:scale-x-100">
            Videos
          </p>
          <p
            className="relative cursor-pointer font-thin after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-blue-100 after:transition-transform after:duration-200 hover:after:scale-x-100">
            Playlists
          </p>
          <p
            className="relative cursor-pointer font-thin after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-blue-100 after:transition-transform after:duration-200 hover:after:scale-x-100">
            About
          </p>
        </div>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
          {videos?.map((video) => (
            <Card key={video.id} id={video.id} duration={video.duration} title={video.title} creator_name={channel.display_name}
                  views={video.view_count} date={video.created_at} thumbnail_src={video.thumbnail_url} is_ai={video.is_ai} />
          ))}
        </div>
      </div>
    </div>
  );
}
