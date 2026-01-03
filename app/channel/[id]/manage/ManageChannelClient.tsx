'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type definitions
interface Channel {
  id: string;
  handle: string;
  display_name: string;
  description: string | null;
  banner_url: string | null;
  avatar_url: string | null;
  video_count: number | null;
  follower_count: number | null;
}

interface Video {
  id: string;
  channel_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  view_count: number | null;
  like_count: number | null;
  dislike_count: number | null;
  star_count: number | null;
  visibility: 'public' | 'private' | 'unlisted';
  is_ai: boolean;
  created_at: string;
  updated_at: string;
}

interface ManageChannelClientProps {
  channel: Channel;
  videos: Video[];
}

interface HeaderProps {
  channel: Channel;
  setChannel: (channel: Channel) => void;
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

interface VideoManagerProps {
  videos: Video[];
  setVideos: (videos: Video[]) => void;
  channelId: string;
  supabase: SupabaseClient;
}

interface VideoCardProps {
  video: Video;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
}

interface EditVideoModalProps {
  video: Video;
  onClose: () => void;
  supabase: SupabaseClient;
  onUpdate: (video: Video) => void;
}

interface ProfileEditorProps {
  channel: Channel;
  setChannel: (channel: Channel) => void;
  supabase: SupabaseClient;
}

interface AdvancedSettingsProps {
  channel: Channel;
  supabase: SupabaseClient;
}

export default function ManageChannelClient({ channel, videos: initialVideos }: ManageChannelClientProps) {
  const supabase = createSupabaseBrowserClient();
  const [currentChannel, setCurrentChannel] = useState<Channel>(channel);
  const [videos, setVideos] = useState<Video[]>(initialVideos);

  return (
    <div className="relative min-h-screen">
      <div className="container mx-auto pl-12 px-10 py-8">
        <Header channel={currentChannel} setChannel={setCurrentChannel} supabase={supabase} />
        <Tabs defaultTab="videos" className="mt-8">
          <TabPanel id="videos">
            <VideoManager videos={videos} setVideos={setVideos} channelId={channel.id} supabase={supabase} />
          </TabPanel>
          <TabPanel id="profile">
            <ProfileEditor channel={currentChannel} setChannel={setCurrentChannel} supabase={supabase} />
          </TabPanel>
          <TabPanel id="settings">
            <AdvancedSettings channel={currentChannel} supabase={supabase} />
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}

function Header({ channel, setChannel, supabase }: HeaderProps) {
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const uploadImage = async (file: File, type: 'banner' | 'avatar') => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${channel.id}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('channel-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('channel-images')
        .getPublicUrl(filePath);

      const updateField = type === 'banner' ? 'banner_url' : 'avatar_url';
      const { error: updateError } = await supabase
        .from('channels')
        .update({ [updateField]: publicUrl })
        .eq('id', channel.id);

      if (updateError) throw updateError;

      setChannel({ ...channel, [updateField]: publicUrl });
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
      <div className="w-full h-64 relative rounded-lg overflow-hidden">
        {bannerPreview || channel.banner_url ? (
          <Image
            src={bannerPreview || channel.banner_url || ''}
            alt={`${channel.display_name}'s banner`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
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
      <div className="relative mt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full overflow-hidden relative shrink-0">
            {avatarPreview || channel.avatar_url ? (
              <Image
                src={avatarPreview || channel.avatar_url || ''}
                alt={`${channel.display_name}'s profile picture`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-zinc-600 text-6xl font-bold text-white">
                {channel.display_name?.[0]?.toUpperCase() ?? "C"}
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
              {channel.display_name}
            </h1>
            <p className="text-sm text-gray-400">
              @{channel.handle}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {channel.video_count ?? 0} video{channel.video_count === 1 ? '' : 's'} •{' '}
              {channel.follower_count ?? 0} follower{channel.follower_count === 1 ? '' : 's'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="w-full sm:w-auto flex-shrink-0 flex gap-2">
            <Link
              href={`/channel/${channel.handle}`}
              className="inline-flex items-center h-10 px-4 rounded-full bg-zinc-800 text-sm font-semibold text-white hover:bg-zinc-700 transition"
            >
              View Channel
            </Link>
          </div>
        </div>

        {channel.description && (
          <p className="mt-4 max-w-2xl text-gray-300">
            {channel.description}
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
  const tabs = ['videos', 'profile', 'settings'];

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
        {['videos', 'profile', 'settings'].map(id => (
          <div key={id} className={active === id ? 'block' : 'hidden'}>
            {children[tabs.indexOf(id)]}
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoManager({ videos, setVideos, channelId, supabase }: VideoManagerProps) {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const toggleSelect = (id: string) => {
    setSelectedVideos(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const bulkUpdateVisibility = async (visibility: 'public' | 'private' | 'unlisted') => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('videos')
        .update({ visibility })
        .in('id', selectedVideos);

      if (error) throw error;

      setVideos(videos.map(v =>
        selectedVideos.includes(v.id) ? { ...v, visibility } : v
      ));
      setSelectedVideos([]);
      alert(`Updated ${selectedVideos.length} video(s) to ${visibility}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error updating videos: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedVideos.length} video(s)? This cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);

      // Get the videos to be deleted for storage cleanup
      const videosToDelete = videos.filter(v => selectedVideos.includes(v.id));

      // Delete video files and thumbnails from storage
      for (const video of videosToDelete) {
        try {
          // Extract file paths from URLs if they exist
          if (video.video_url) {
            const videoPath = video.video_url.split('/').slice(-2).join('/');
            await supabase.storage.from('videos').remove([videoPath]);
          }

          if (video.thumbnail_url && !video.thumbnail_url.includes('Placeholder')) {
            const thumbPath = video.thumbnail_url.split('/').slice(-2).join('/');
            await supabase.storage.from('thumbnails').remove([thumbPath]);
          }
        } catch (storageError) {
          console.error('Error deleting storage files:', storageError);
          // Continue even if storage deletion fails
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('videos')
        .delete()
        .in('id', selectedVideos);

      if (error) throw error;

      // Update UI
      setVideos(videos.filter(v => !selectedVideos.includes(v.id)));
      setSelectedVideos([]);
      alert(`Successfully deleted ${videosToDelete.length} video(s)`);
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error deleting videos: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {selectedVideos.length > 0 && (
        <div className="bg-zinc-800/50 backdrop-blur-sm rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-sm text-gray-300">
            {selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => bulkUpdateVisibility('public')}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-zinc-700 text-white rounded hover:bg-zinc-600 transition disabled:opacity-50"
            >
              Make Public
            </button>
            <button
              onClick={() => bulkUpdateVisibility('private')}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-zinc-700 text-white rounded hover:bg-zinc-600 transition disabled:opacity-50"
            >
              Make Private
            </button>
            <button
              onClick={bulkDelete}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-500 transition disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map(v => (
          <VideoCard
            key={v.id}
            video={v}
            isSelected={selectedVideos.includes(v.id)}
            onToggleSelect={() => toggleSelect(v.id)}
            onEdit={() => setEditVideo(v)}
          />
        ))}
      </div>

      {editVideo && (
        <EditVideoModal
          video={editVideo}
          onClose={() => setEditVideo(null)}
          supabase={supabase}
          onUpdate={(updated) => {
            setVideos(videos.map(v => v.id === updated.id ? updated : v));
            setEditVideo(null);
          }}
        />
      )}
    </div>
  );
}

function VideoCard({ video, isSelected, onToggleSelect, onEdit }: VideoCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(video.thumbnail_url || '/StellicastPlaceholderThumbnail.png');

  const formatDuration = (duration: number) => {
    if (!duration || duration <= 0) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number | null) => {
    const v = views ?? 0;
    return `${v} view${v === 1 ? '' : 's'}`;
  };

  return (
    <div className={`group overflow-hidden rounded-2xl border shadow-sm transition ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-800 hover:border-gray-700'} bg-[#0a0a0a]`}>
      <div className="relative aspect-video bg-gray-900">
        <Image
          src={imgSrc}
          alt={video.title}
          fill
          className="object-cover"
          onError={() => setImgSrc('/StellicastPlaceholderThumbnail.png')}
        />

        {video.is_ai && (
          <div className="absolute left-2 top-2 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">
            AI
          </div>
        )}

        <div className="absolute right-2 top-2 rounded-md bg-black/75 px-2 py-1 text-sm font-semibold text-white">
          {formatDuration(video.duration)}
        </div>

        <label
          className="absolute left-2 bottom-2 cursor-pointer z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="w-5 h-5 rounded cursor-pointer accent-blue-600 shadow-lg"
            aria-label={`Select ${video.title}`}
          />
        </label>

        <div className="absolute inset-0 bg-gradient-to-tr via-transparent opacity-0 transition-opacity group-hover:opacity-100 from-white/5 to-white/5 pointer-events-none" />
      </div>

      <div className="space-y-2 p-4">
        <div className="line-clamp-2 text-sm font-semibold leading-snug">
          {video.title}
        </div>

        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-gray-500">
            {formatViews(video.view_count)} • {new Date(video.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className={`text-xs px-2 py-1 rounded-md font-medium ${video.visibility === 'public' ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'}`}>
            {video.visibility === 'public' ? 'Public' : 'Private'}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              onEdit();
            }}
            className="text-xs text-blue-400 hover:text-blue-300 transition font-semibold px-2 py-1 rounded hover:bg-blue-400/10"
            aria-label={`Edit ${video.title}`}
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function EditVideoModal({ video, onClose, supabase, onUpdate }: EditVideoModalProps) {
  const [form, setForm] = useState({
    title: video.title,
    description: video.description ?? "",
    visibility: video.visibility,
    is_ai: video.is_ai,
  });
  const [saving, setSaving] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('videos')
        .update({
          title: form.title,
          description: form.description,
          visibility: form.visibility,
          is_ai: form.is_ai,
          updated_at: new Date().toISOString()
        })
        .eq('id', video.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data as Video);
      alert('Video updated successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error updating video: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-zinc-900 rounded-lg max-w-lg w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-semibold text-white mb-4">Edit Video</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="video-title" className="block text-sm font-medium text-gray-200 mb-1">Title</label>
            <input
              id="video-title"
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-md bg-zinc-800 border border-zinc-600 text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="video-description" className="block text-sm font-medium text-gray-200 mb-1">Description</label>
            <textarea
              id="video-description"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full rounded-md bg-zinc-800 border border-zinc-600 text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Add a description for your video..."
            />
          </div>

          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-200 mb-1">Visibility</label>
            <select
              id="visibility"
              value={form.visibility}
              onChange={e => setForm({ ...form, visibility: e.target.value as 'public' | 'private' | 'unlisted' })}
              className="w-full rounded-md bg-zinc-800 border border-zinc-600 text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_ai"
              checked={form.is_ai}
              onChange={e => setForm({ ...form, is_ai: e.target.checked })}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <label htmlFor="is_ai" className="text-sm text-gray-200">Contains AI content</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-200 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-500 transition hover:shadow-lg hover:shadow-blue-600/30 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProfileEditor({ channel, setChannel, supabase }: ProfileEditorProps) {
  const [form, setForm] = useState({
    display_name: channel.display_name,
    description: channel.description ?? "",
  });
  const [saving, setSaving] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('channels')
        .update({
          display_name: form.display_name,
          description: form.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', channel.id)
        .select()
        .single();

      if (error) throw error;

      setChannel(data as Channel);
      alert('Profile updated successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error updating profile: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
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
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-200 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={form.description}
          onChange={handleChange}
          className="block w-full rounded-md bg-zinc-800 border border-zinc-600 text-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
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

function AdvancedSettings({ channel, supabase }: AdvancedSettingsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('channel_id', channel.id);

      if (error) throw error;

      const csv = [
        ['Title', 'Views', 'Likes', 'Dislikes', 'Stars', 'Created At', 'Visibility'].join(','),
        ...(data as Video[]).map(v => [
          `"${v.title}"`,
          v.view_count,
          v.like_count,
          v.dislike_count,
          v.star_count,
          v.created_at,
          v.visibility
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${channel.handle}-analytics.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error exporting analytics: ${errorMessage}`);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);

      // Delete all videos first (cascade should handle this, but being explicit)
      const { error: videoError } = await supabase
        .from('videos')
        .delete()
        .eq('channel_id', channel.id);

      if (videoError) throw videoError;

      // Delete the channel
      const { error: channelError } = await supabase
        .from('channels')
        .delete()
        .eq('id', channel.id);

      if (channelError) throw channelError;

      alert('Channel deleted successfully!');
      window.location.href = '/';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error deleting channel: ${errorMessage}`);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Export analytics */}
      <div className="p-4 bg-zinc-900/50 rounded-lg">
        <h3 className="text-sm font-medium text-white mb-2">Analytics Export</h3>
        <p className="text-xs text-gray-400 mb-4">Download your channel analytics and metrics</p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-500 transition"
          aria-label="Export analytics"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export analytics (CSV)
        </button>
      </div>

      {/* Danger Zone */}
      <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-lg">
        <h3 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h3>
        <p className="text-xs text-gray-400 mb-4">
          Delete your channel permanently. All videos and data will be removed. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-500 transition"
        >
          Delete channel
        </button>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-semibold text-white mb-2">Delete Channel?</h2>
              <p className="text-sm text-gray-400 mb-6">
                This will permanently delete your channel, all videos, and data. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-200 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded hover:bg-red-500 transition disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
