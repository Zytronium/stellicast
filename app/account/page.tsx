'use client';

import { useState, useEffect } from 'react';
import { User, Plus, Edit, Upload, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';

type Channel = {
  id: string;
  channel_type: 'creator' | 'studio';
  display_name: string;
  handle: string;
  description?: string;
  avatar_url?: string;
  banner_url?: string;
  video_count: number;
  follower_count: number;
  created_at: string;
};

type UserProfile = {
  id: string;
  username: string;
  display_name?: string;
  email: string;
  avatar_url?: string;
  banner_url?: string;
};

export default function AccountPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [channelType, setChannelType] = useState<'creator' | 'studio'>('creator');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');

  useEffect(() => {
    loadAccountData();
  }, []);

  const loadAccountData = async () => {
    try {
      // Fetch user profile
      const userRes = await fetch('/api/account/profile');
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData.user);
      }

      // Fetch user's channels
      const channelsRes = await fetch('/api/account/channels');
      if (channelsRes.ok) {
        const channelsData = await channelsRes.json();
        setChannels(channelsData.channels || []);
      }
    } catch (error) {
      console.error('Failed to load account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!displayName || !handle) {
      alert('Please fill in required fields');
      return;
    }

    if (channelType === 'studio' && !companyName) {
      alert('Company name is required for studio channels');
      return;
    }

    setCreating(true);

    try {
      const payload: any = {
        channel_type: channelType,
        display_name: displayName,
        handle: handle.toLowerCase().replace(/[^a-z0-9_]/g, ''),
        description,
      };

      if (channelType === 'creator') {
        payload.website = website;
      } else {
        payload.company_name = companyName;
        payload.business_email = businessEmail;
      }

      const res = await fetch('/api/account/channels/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create channel');
      }

      // Reload channels
      await loadAccountData();
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setDisplayName('');
    setHandle('');
    setDescription('');
    setWebsite('');
    setCompanyName('');
    setBusinessEmail('');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const displayNameText = user?.display_name || user?.username || 'User';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* User Profile Section */}
      <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Account Settings</h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={displayNameText}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold">
              {displayNameText[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">{displayNameText}</h2>
            <p className="text-sm text-gray-400">@{user?.username}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Channels Section */}
      <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Your Channels</h2>
            <p className="text-sm text-gray-400 mt-1">Manage your creator and studio channels</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
          >
            <Plus className="w-4 h-4" />
            Create Channel
          </button>
        </div>

        {channels.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition"
              >
                <div className="flex items-start gap-4">
                  {channel.avatar_url ? (
                    <Image
                      src={channel.avatar_url}
                      alt={channel.display_name}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold flex-shrink-0">
                      {channel.display_name[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{channel.display_name}</h3>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300">
                        {channel.channel_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">@{channel.handle}</p>
                    {channel.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{channel.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span>{channel.video_count} videos</span>
                      <span>{channel.follower_count} followers</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => router.push(`/upload?channel=${channel.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 transition"
                  >
                    <Upload className="w-4 h-4" />
                    Upload
                  </button>
                  <button
                    onClick={() => router.push(`/channel/${channel.handle}/manage`)}
                    className="px-3 py-2 border border-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition"
                    title="Manage Channel"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 mb-4">You don't have any channels yet</p>
            <p className="text-sm text-gray-500 mb-6">Create a channel to start uploading videos</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition"
            >
              <Plus className="w-5 h-5" />
              Create Your First Channel
            </button>
          </div>
        )}
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-800">
            <div className="p-6 border-b border-gray-800 sticky top-0 bg-gray-900">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Create New Channel</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Channel Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Channel Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setChannelType('creator')}
                    className={`p-4 rounded-xl border-2 transition ${
                      channelType === 'creator'
                        ? 'border-blue-600 bg-blue-600/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <h3 className="font-semibold mb-1">Creator</h3>
                    <p className="text-sm text-gray-400">For individual content creators</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelType('studio')}
                    className={`p-4 rounded-xl border-2 transition ${
                      channelType === 'studio'
                        ? 'border-blue-600 bg-blue-600/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <h3 className="font-semibold mb-1">Studio</h3>
                    <p className="text-sm text-gray-400">For production companies & teams</p>
                  </button>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Display Name *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="My Awesome Channel"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Handle */}
              <div>
                <label className="block text-sm font-medium mb-2">Handle *</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="mychannel"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Only lowercase letters, numbers, and underscores</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your channel..."
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              {/* Creator-specific fields */}
              {channelType === 'creator' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Website</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
                  />
                </div>
              )}

              {/* Studio-specific fields */}
              {channelType === 'studio' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Company Name *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Studios Inc."
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Business Email</label>
                    <input
                      type="email"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder="contact@company.com"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateChannel}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 transition"
                >
                  {creating ? 'Creating...' : 'Create Channel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
