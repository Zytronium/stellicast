import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Card from "@/components/Card";
import Link from 'next/link';
import FollowButton from '@/components/FollowButton'; // Add this import

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
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });

  const { data: userData } = await supabase.auth.getUser();
  const currentUser = userData?.user ?? null;
  const isOwner = currentUser?.id === channel.owner_id;

  // Check if current user is following this channel
  let isFollowing = false;
  if (currentUser && !isOwner) {
    const { data: followerData } = await supabase
      .from('followers')
      .select('user_id')
      .eq('user_id', currentUser.id)
      .eq('channel_id', channel.id)
      .maybeSingle();

    isFollowing = !!followerData;
  }

  return (
    <div className="relative">
      <div className="w-full h-40 sm:h-64 relative">
        {channel.banner_url ? (
          <Image
            src={channel.banner_url}
            alt={`${channel.display_name}'s banner`}
            fill
            className="object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-full bg-secondary" />
        )}
      </div>

      <div className="container mx-auto px-4 sm:pl-12 sm:px-10">
        <div className="relative mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pr-4">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full overflow-hidden relative shrink-0">
              {channel.avatar_url ? (
                <Image
                  src={channel.avatar_url}
                  alt={`${channel.display_name}'s profile picture`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div
                  className="grid h-full w-full place-items-center bg-muted text-4xl sm:text-6xl font-bold text-muted-foreground"
                >
                  {channel.display_name?.[0]?.toUpperCase() ?? "C"}
                </div>
              )}
            </div>

            {/* Name + metadata */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                {channel.display_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                @{channel.handle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
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
                      className="inline-flex items-center justify-center h-9 sm:h-10 px-6 rounded-full bg-secondary text-sm font-semibold text-secondary-foreground hover:bg-muted transition"
                      aria-label="Manage"
                      title="Manage"
                >Manage</Link>
              ) : (
                <FollowButton
                  channelId={channel.id}
                  initialFollowing={isFollowing}
                  initialFollowerCount={channel.follower_count ?? 0}
                />
              )}
            </div>
          </div>

          {channel.description && (
            <p className="mt-4 max-w-2xl text-sm sm:text-base text-card-foreground">
              {channel.description}
            </p>
          )}
        </div>

        <div className="flex flex-row gap-4 sm:gap-8 mt-6">
          <p
            className="relative cursor-pointer text-sm sm:text-base font-bold text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-100 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-110">
            Videos
          </p>
          <p
            className="relative cursor-pointer text-sm sm:text-base font-thin text-muted-foreground hover:text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100">
            Playlists
          </p>
          <p
            className="relative cursor-pointer text-sm sm:text-base font-thin text-muted-foreground hover:text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100">
            About
          </p>
        </div>
        <hr className="border-border mt-2"/>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
          {videos?.map((video) => (
            <Card key={video.id} slug={video.slug} duration={video.duration} title={video.title} creator_name={channel.display_name}
                  views={video.view_count} date={video.created_at} thumbnail_src={video.thumbnail_url} is_ai={video.is_ai} />
          ))}
        </div>
      </div>
    </div>
  );
}
