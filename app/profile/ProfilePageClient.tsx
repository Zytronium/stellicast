'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type definitions
interface User {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

interface Channel {
  id: string;
  handle: string;
  display_name: string;
  description: string | null;
  avatar_url: string | null;
  video_count: number | null;
  follower_count: number | null;
}

interface ProfilePageClientProps {
  user: User;
  channels: Channel[];
}

interface HeaderProps {
  user: User;
  setUser: (user: User) => void;
  supabase: SupabaseClient;
}

interface TabPanelProps {
  children: React.ReactNode;
  id: string;
}

interface TabsProps {
  children: React.ReactNode[];
  defaultTab: string;
  className?: string;
}

interface ProfileEditorProps {
  user: User;
  setUser: (user: User) => void;
  supabase: SupabaseClient;
}

interface UsernameChangeInfo {
  canChange: boolean;
  changesUsed: number;
  changesRemaining: number;
  nextChangeAvailable: string | null;
}

interface ChannelsListProps {
  channels: Channel[];
}

export default function ProfilePageClient({ user, channels }: ProfilePageClientProps) {
  const supabase = createSupabaseBrowserClient();
  const [currentUser, setCurrentUser] = useState<User>(user);

  return (
    <div className="relative min-h-full">
      <div className="container mx-auto">
        <Header user={currentUser} setUser={setCurrentUser} supabase={supabase} />
        <Tabs defaultTab="profile" className="mt-8 px-12">
          <TabPanel id="profile">
            <ProfileEditor user={currentUser} setUser={setCurrentUser} supabase={supabase} />
          </TabPanel>
          <TabPanel id="channels">
            <ChannelsList channels={channels} />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}

function Header({ user, setUser, supabase }: HeaderProps) {
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const uploadImage = async (file: File, type: 'banner' | 'avatar') => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-images')
        .getPublicUrl(filePath);

      const updateField = type === 'banner' ? 'banner_url' : 'avatar_url';
      const { error: updateError } = await supabase
        .from('users')
        .update({ [updateField]: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setUser({ ...user, [updateField]: publicUrl });
      alert(`${type} updated successfully!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error uploading ${type}: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          setBannerPreview(event.target.result);
        }
      };
      reader.readAsDataURL(file);
      uploadImage(file, 'banner');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          setAvatarPreview(event.target.result);
        }
      };
      reader.readAsDataURL(file);
      uploadImage(file, 'avatar');
    }
  };

  return (
    <div className="relative">
      {/* Banner */}
      <div className="w-full h-64 relative rounded-b-lg overflow-hidden">
        {bannerPreview || user.banner_url ? (
          <Image
            src={bannerPreview || user.banner_url || ''}
            alt={`${user.display_name}'s banner`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-blue-950" />
        )}
        <label
          htmlFor="bannerUpload"
          className={`absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-xs text-white px-3 py-2 rounded cursor-pointer hover:bg-black/80 transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {uploading ? 'Uploading...' : 'Change banner'}
          <input
            id="bannerUpload"
            type="file"
            accept="image/*"
            onChange={handleBannerChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {/* Profile section */}
      <div className="relative mt-4 px-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full overflow-hidden relative shrink-0">
            {avatarPreview || user.avatar_url ? (
              <Image
                src={avatarPreview || user.avatar_url || ''}
                alt={`${user.display_name}'s profile picture`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-zinc-600 text-6xl font-bold text-white">
                {user.display_name?.[0]?.toUpperCase() ?? user.username?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <label
              htmlFor="avatarUpload"
              className={`absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-xs text-white font-medium ${uploading ? 'cursor-not-allowed' : ''}`}
              aria-label="Change avatar"
            >
              {uploading ? 'Uploading...' : 'Change'}
              <input
                id="avatarUpload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {/* Name + metadata */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {user.display_name || user.username}
            </h1>
            <p className="text-sm text-gray-400">
              @{user.username}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Joined: {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Action buttons */}
          <div className="w-full sm:w-auto flex-shrink-0 flex gap-2">
            <Link
              href={`/user/${user.username}`}
              className="inline-flex items-center h-10 px-4 rounded-full bg-zinc-800 text-sm font-semibold text-white hover:bg-zinc-700 transition"
            >
              View Profile
            </Link>
          </div>
        </div>

        {user.description && (
          <p className="mt-4 max-w-2xl text-gray-300">
            {user.description}
          </p>
        )}
      </div>
    </div>
  );
}

function TabPanel({ children, id }: TabPanelProps) {
  return <div role="tabpanel" id={`panel-${id}`}>{children}</div>;
}

function Tabs({ children, defaultTab, className }: TabsProps) {
  const [active, setActive] = useState<string>(defaultTab);
  const tabs = ['profile', 'channels'];

  return (
    <div className={className}>
      <div className="flex flex-row gap-8 mt-6">
        {tabs.map(id => (
          <p
            key={id}
            onClick={() => setActive(id)}
            role="tab"
            aria-selected={active === id}
            className={`relative cursor-pointer transition-all ${
              active === id
                ? 'font-bold after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-100 after:bg-blue-100 after:transition-transform after:duration-200 hover:after:scale-x-110'
                : 'font-thin after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-blue-100 after:transition-transform after:duration-200 hover:after:scale-x-100'
            }`}
          >
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </p>
        ))}
      </div>
      <hr className="border-zinc-600 mt-2"/>

      <div className="pt-8">
        {['profile', 'channels'].map(id => (
          <div key={id} className={active === id ? 'block' : 'hidden'}>
            {children[tabs.indexOf(id)]}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileEditor({ user, setUser, supabase }: ProfileEditorProps) {
  const [form, setForm] = useState({
    username: user.username,
    display_name: user.display_name || '',
    description: user.description || '',
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [usernameChanged, setUsernameChanged] = useState<boolean>(false);
  const [usernameError, setUsernameError] = useState<string>('');
  const [usernameChangeInfo, setUsernameChangeInfo] = useState<UsernameChangeInfo | null>(null);
  const [loadingChangeInfo, setLoadingChangeInfo] = useState<boolean>(true);

  // Fetch username change info on mount
  useEffect(() => {
    fetchUsernameChangeInfo();
  }, []);

  const fetchUsernameChangeInfo = async () => {
    try {
      setLoadingChangeInfo(true);
      const response = await fetch('/api/account/username-changes');
      if (response.ok) {
        const data = await response.json();
        setUsernameChangeInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch username change info:', error);
    } finally {
      setLoadingChangeInfo(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Track if username was changed
    if (name === 'username') {
      setUsernameChanged(value !== user.username);
      setUsernameError('');
    }
  };

  const validateUsername = (username: string): string | null => {
    if (username.length < 3 || username.length > 30) {
      return 'Username must be between 3 and 30 characters';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    return null;
  };

  const handleSubmit = async () => {
    // Validate username if it changed
    if (usernameChanged) {
      const validationError = validateUsername(form.username);
      if (validationError) {
        setUsernameError(validationError);
        return;
      }

      // Check if user has changes remaining
      if (usernameChangeInfo && !usernameChangeInfo.canChange) {
        setUsernameError('You can only change your username 3 times per day');
        return;
      }
    }

    try {
      setSaving(true);
      setUsernameError('');

      const updates: Record<string, any> = {
        display_name: form.display_name,
        description: form.description,
        updated_at: new Date().toISOString()
      };

      // Only include username if it changed
      if (usernameChanged) {
        updates.username = form.username;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        // Check for specific error types
        if (error.message.includes('duplicate key')) {
          setUsernameError('Username is already taken');
          return;
        }
        throw error;
      }

      setUser(data as User);
      setUsernameChanged(false);

      // Refresh username change info if username was changed
      if (updates.username) {
        await fetchUsernameChangeInfo();
      }

      alert('Profile updated successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check for rate limit error
      if (errorMessage.includes('3 times per day')) {
        setUsernameError('You can only change your username 3 times per day');
      } else if (errorMessage.includes('already taken')) {
        setUsernameError('Username is already taken');
      } else {
        alert(`Error updating profile: ${errorMessage}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const formatNextChangeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-200 mb-1">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          value={form.username}
          onChange={handleChange}
          className={`block w-full rounded-md bg-zinc-800 border ${
            usernameError ? 'border-red-500' : 'border-zinc-600'
          } text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
          placeholder="Your username"
        />
        {!loadingChangeInfo && usernameChangeInfo && (
          <div className="mt-1 text-xs">
            {usernameChanged && !usernameError && usernameChangeInfo.canChange && (
              <p className="text-yellow-500">
                ⚠️ Username changes remaining today: {usernameChangeInfo.changesRemaining}/3
              </p>
            )}
            {usernameChanged && !usernameError && !usernameChangeInfo.canChange && (
              <p className="text-red-500">
                ❌ No username changes remaining. Try again in {formatNextChangeTime(usernameChangeInfo.nextChangeAvailable!)}
              </p>
            )}
            {!usernameChanged && usernameChangeInfo.changesUsed > 0 && (
              <p className="text-gray-500">
                Username changes used today: {usernameChangeInfo.changesUsed}/3
              </p>
            )}
          </div>
        )}
        {usernameError && (
          <p className="mt-1 text-xs text-red-500">
            {usernameError}
          </p>
        )}
        {!usernameChanged && !usernameError && !loadingChangeInfo && (
          <p className="mt-1 text-xs text-gray-500">
            Letters, numbers, underscores, and hyphens only
          </p>
        )}
      </div>

      <div>
        <label htmlFor="display_name" className="block text-sm font-medium text-gray-200 mb-1">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          value={form.display_name}
          onChange={handleChange}
          className="block w-full rounded-md bg-zinc-800 border border-zinc-600 text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Your display name"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-200 mb-1">
          Bio
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={form.description}
          onChange={handleChange}
          className="block w-full rounded-md bg-zinc-800 border border-zinc-600 text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          placeholder="Tell us about yourself..."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="h-10 px-6 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-500 transition hover:shadow-lg hover:shadow-blue-600/30 disabled:opacity-50"
        >
          {saving ? 'Updating...' : 'Update profile'}
        </button>
      </div>
    </div>
  );
}

function ChannelsList({ channels }: ChannelsListProps) {
  return (
    <div>
      {channels.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">You don&apos;t have any channels yet</p>
          <Link
            href="/account"
            className="inline-flex items-center h-10 px-6 rounded-full bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500 transition hover:shadow-lg hover:shadow-blue-600/30"
          >
            Create a channel
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/channel/${channel.handle}`}
              className="group block p-6 rounded-lg bg-gradient-darker border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-200"
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
      )}
    </div>
  );
}
