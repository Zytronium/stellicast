'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import VideoUpload from '@/components/VideoUpload';
import { CloudArrowUpIcon, ShieldCheckIcon, InformationCircleIcon, ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';

interface Channel {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  channel_type: string;
}

function UploadContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get channel ID from URL (?channel=...)
  const urlChannelId = searchParams.get('channel');

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  useEffect(() => {
    const initUpload = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth?next=/upload');
        return;
      }
      setUser(user);

      // Fetch all user's channels
      const { data: userChannels, error: channelsError } = await supabase
        .from('channels')
        .select('id, display_name, handle, avatar_url, channel_type')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (channelsError) {
        console.error('Error fetching channels:', channelsError);
        setLoading(false);
        return;
      }

      setChannels(userChannels || []);

      // Select channel based on URL parameter or default to first channel
      if (urlChannelId) {
        const channel = userChannels?.find(ch => ch.id === urlChannelId);
        setSelectedChannel(channel || userChannels?.[0] || null);
      } else {
        setSelectedChannel(userChannels?.[0] || null);
      }

      setLoading(false);
    };
    initUpload();
  }, [router, supabase, urlChannelId]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    setShowChannelDropdown(false);
    // Update URL with selected channel
    router.push(`/upload?channel=${channel.id}`, { scroll: false });
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-[#0a0a0a] border border-gray-800 rounded-2xl text-center">
        <CloudArrowUpIcon className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">No Channels Found</h2>
        <p className="text-gray-400 mb-6">You need to create a channel before you can upload videos.</p>
        <Link
          href="/account"
          className="inline-flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Create a Channel
        </Link>
      </div>
    );
  }

  if (!selectedChannel) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-3">
          <CloudArrowUpIcon className="w-8 h-8 text-blue-500" />
          Upload Video
        </h1>

        {/* Channel Selector */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Upload to channel
          </label>
          <button
            onClick={() => setShowChannelDropdown(!showChannelDropdown)}
            className="w-full md:w-auto min-w-[300px] flex items-center justify-between gap-3 px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl hover:border-gray-600 transition"
          >
            <div className="flex items-center gap-3">
              {selectedChannel.avatar_url ? (
                <Image
                  src={selectedChannel.avatar_url}
                  alt={selectedChannel.display_name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                  {selectedChannel.display_name[0].toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <p className="font-semibold">{selectedChannel.display_name}</p>
                <p className="text-xs text-gray-400">@{selectedChannel.handle}</p>
              </div>
            </div>
            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${showChannelDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {showChannelDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowChannelDropdown(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-full md:w-auto min-w-[300px] bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition ${
                      selectedChannel.id === channel.id ? 'bg-gray-800/50' : ''
                    }`}
                  >
                    {channel.avatar_url ? (
                      <Image
                        src={channel.avatar_url}
                        alt={channel.display_name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                        {channel.display_name[0].toUpperCase()}
                      </div>
                    )}
                    <div className="text-left flex-1">
                      <p className="font-semibold">{channel.display_name}</p>
                      <p className="text-xs text-gray-400">@{channel.handle}</p>
                    </div>
                    {selectedChannel.id === channel.id && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <VideoUpload channelId={selectedChannel.id} key={selectedChannel.id} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-blue-400">
              <ShieldCheckIcon className="w-5 h-5" />
              Upload Guidelines
            </h3>
            <ul className="text-xs text-gray-400 space-y-3">
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                Ensure you own the rights to the content you are uploading.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                Videos must comply with our community standards.
              </li>
              <li className="flex gap-2">
                <span className="text-blue-500">•</span>
                AI-generated content must be disclosed during the upload process.
              </li>
            </ul>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-3">
              <InformationCircleIcon className="w-5 h-5 text-gray-400" />
              File Requirements
            </h3>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Max size</span>
                <span className="text-gray-300">2 GB</span>
              </div>
              <div className="flex justify-between">
                <span>Formats</span>
                <span className="text-gray-300">MP4, MOV, WebM</span>
              </div>
              <div className="flex justify-between">
                <span>Resolution</span>
                <span className="text-gray-300">Up to 4K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
      </div>
    }>
      <UploadContent />
    </Suspense>
  );
}
