'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import VideoUpload from '@/components/VideoUpload';
import { CloudArrowUpIcon, ShieldCheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export default function UploadPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth?next=/upload');
      } else {
        setUser(user);
        setLoading(false);
      }
    };
    checkUser();
  }, [router, supabase.auth]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <CloudArrowUpIcon className="w-8 h-8 text-blue-500" />
          Upload Video
        </h1>
        <p className="text-gray-400">Share your content with the Stellicast community.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <VideoUpload />
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
