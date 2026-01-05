import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

type PageParams = {
  id: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', id.toLowerCase())
    .single();

  if (error || !user) {
    notFound();
  }

  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const { data: userData } = await supabase.auth.getUser();
  const currentUser = userData?.user ?? null;
  const isThisUser = currentUser?.id === user.id;
  const channelCount = channels?.length ?? 0;

  return (
    <div className="relative">
      <div className="w-full h-64 relative">
        {user.banner_url ? (
          <Image
            src={user.banner_url}
            alt={`${user.display_name}'s banner`}
            fill
            className="object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-full bg-blue-950" />
        )}
      </div>

      <div className="container mx-auto pl-12 px-10">
        <div className="relative mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pr-4">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full overflow-hidden relative shrink-0">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={`${user.display_name}'s profile picture`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div
                  className="grid h-full w-full place-items-center bg-zinc-600 text-6xl font-bold text-white"
                >
                  {user.display_name?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
            </div>

            {/* Name + metadata */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {user.display_name}
              </h1>
              <p className="text-sm text-gray-400">
                @{user.username}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {(channelCount ?? 0)} channel{(channelCount ?? 0) === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Joined: {(formatDate(user.created_at))}
              </p>
            </div>

            {/* Manage button */}
            <div className="w-full sm:w-auto flex-shrink-0">
              {isThisUser && (
                <Link href={`/profile`}
                      className="inline-flex items-center h-10 px-6 rounded-full bg-zinc-800 text-sm font-semibold text-white hover:bg-zinc-700 transition"
                      aria-label="Manage"
                      title="Manage"
                >Manage</Link>
              )}
            </div>
          </div>

          {user.description && (
            <p className="mt-4 max-w-2xl text-gray-300">
              {user.description}
            </p>
          )}
        </div>

        <div className="flex flex-row gap-18 mt-6">
          <p
            className="relative cursor-pointer font-bold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-100 after:bg-blue-100 after:transition-transform after:duration-200 hover:after:scale-x-110">
            Channels
          </p>
          <p
            className="relative cursor-pointer font-thin after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-blue-100 after:transition-transform after:duration-200 hover:after:scale-x-100">
            Follows
          </p>
        </div>
        <hr className="border-zinc-600 mt-2"/>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
          {channels?.map((channel) => (
            <Link
              key={channel.id}
              href={`/channel/${channel.handle}`}
              className="group block p-6 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
            >
              <div className="flex flex-col items-center text-center">
                  {/* Channel Avatar */}
                <div className="w-24 h-24 rounded-full overflow-hidden relative mb-4">
                    {channel.avatar_url ? (
                      <Image
                        src={channel.avatar_url}
                        alt={`${channel.display_name}'s avatar`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-zinc-600 text-3xl font-bold text-white">
                        {channel.display_name?.[0]?.toUpperCase() ?? "C"}
                      </div>
                    )}
                  </div>

                  {/* Channel Info */}
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {channel.display_name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      @{channel.handle}
                    </p>

                    {/* Stats */}
                <div className="flex gap-3 mt-3 text-sm text-gray-400">
                      <span>{channel.follower_count ?? 0} followers</span>
                      <span>•</span>
                      <span>{channel.video_count ?? 0} videos</span>
                    </div>

                    {/* Description */}
                    {channel.description && (
                  <p className="text-sm text-gray-400 mt-3 line-clamp-2 w-full">
                        {channel.description}
                      </p>
                    )}
                  </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
