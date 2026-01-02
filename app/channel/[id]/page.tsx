import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Card from "@/components/Card";
import Link from 'next/link';

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
    .eq('handle', id.toLowerCase())
    .single();

  if (error || !channel) {
    notFound();
  }

  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .eq('channel_id', channel.id)
    .order('created_at', { ascending: false });

  const { data: userData } = await supabase.auth.getUser();
  const currentUser = userData?.user ?? null;
  const isOwner = currentUser?.id === channel.owner_id;

  return (
    <div className="relative">
      <div className="w-full h-64 relative">
        {channel.banner_url ? (
          <Image
            src={channel.banner_url}
            alt={`${channel.display_name}'s banner`}
            fill
            className="object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
      </div>

      <div className="container mx-auto pl-12 px-10">
        <div className="relative mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full overflow-hidden relative shrink-0">
            {channel.avatar_url ? (
              <Image
                src={channel.avatar_url}
                alt={`${channel.display_name}'s profile picture`}
                fill
                className="object-cover"
              />
            ) : (
              <div
                  className="grid h-full w-full place-items-center bg-zinc-600 text-6xl font-bold text-white"
              >
                {channel.display_name?.[0]?.toUpperCase() ?? "C"}
              </div>
            )}
          </div>

            {/* Name + metadata */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {channel.display_name}
              </h1>
              <p className="text-sm text-gray-400">
                @{channel.handle}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {(videos?.length ?? channel.video_count ?? 0)} video
                {(videos?.length ?? channel.video_count ?? 0) === 1 ? '' : 's'} •{' '}
                {(channel.follower_count ?? 0)} follower
                {(channel.follower_count ?? 0) === 1 ? '' : 's'}
              </p>
            </div>

            {/* Follow/Manage button */}
            <div className="w-full sm:w-auto flex-shrink-0">
              {isOwner ? (
                <Link href={`/channel/${channel.handle}/manage`}
                      className="inline-flex items-center h-10 px-6 rounded-full bg-zinc-800 text-sm font-semibold text-white hover:bg-zinc-700 transition"
                      aria-label="Manage"
                      title="Manage"
                      >Manage</Link>
              ) : (

                <button
                  type="button"
                  className="
                  h-10
                  px-6
                  w-full sm:w-auto
                  rounded-full
                  bg-blue-600
                  text-sm font-semibold text-white
                  hover:bg-blue-500
                  transition
                  self-center
                  hover:shadow-lg hover:shadow-blue-600/30
                "
                >Follow</button>
              )}
          </div>
          </div>

          {channel.description && (
            <p className="mt-4 max-w-2xl text-gray-300">
              {channel.description}
            </p>
          )}
        </div>

        <div className="flex flex-row gap-18 mt-6">
          <p
            className="relative cursor-pointer font-bold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-100 after:bg-blue-100 after:transition-transform after:duration-200 hover:after:scale-x-110">
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
        <hr className="border-zinc-600 mt-2"/>
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
