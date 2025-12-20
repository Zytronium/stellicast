'use client';

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import VideoUpload from '@/components/VideoUpload';
import { CloudArrowUpIcon, ShieldCheckIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

function UploadContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get channel ID from URL (?channel=...)
  const urlChannelId = searchParams.get('channel');

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initUpload = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth?next=/upload');
        return;
      }
      setUser(user);

      if (!urlChannelId) {
        setError('No channel selected. Please go to your account page and select a channel to upload videos.');
        setLoading(false);
        return;
      }

      // Verify the channel exists and belongs to the user
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', urlChannelId)
        .eq('owner_id', user.id)
        .single();

      if (channelError || !channel) {
        setError('The selected channel is invalid or you do not have permission to upload to it.');
      } else {
        setSelectedChannel(channel);
      }
      
      setLoading(false);
    };
    initUpload();
  }, [router, supabase, urlChannelId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !selectedChannel) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-[#0a0a0a] border border-gray-800 rounded-2xl text-center">
        <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Selection Error</h2>
        <p className="text-gray-400 mb-6">{error || 'Please select a valid channel to continue.'}</p>
        <Link 
          href="/account" 
          className="inline-block w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-colors"
        >
          Go to Account Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <CloudArrowUpIcon className="w-8 h-8 text-blue-500" />
          Upload to {selectedChannel.display_name}
        </h1>
        <p className="text-gray-400">Share your content as @{selectedChannel.handle}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <VideoUpload channelId={selectedChannel.id}/>
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
