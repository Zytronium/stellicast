'use client';

import {useState, useEffect, useRef} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  status: 'active' | 'frozen' | 'pending';
}

interface Video {
  id: string;
  channel_id: string;
  slug: string;
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
  onTabChange?: (tab: string) => void;
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
  onDelete: () => void;
}

interface EditVideoModalProps {
  video: Video;
  onClose: () => void;
  supabase: SupabaseClient;
  onUpdate: (video: Video) => void;
}

interface AssignedSector {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  approval_status: 'approved' | 'pending' | 'rejected' | null;
}

interface SectorSearchResult {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface ProfileEditorProps {
  channel: Channel;
  setChannel: (channel: Channel) => void;
  supabase: SupabaseClient;
}

interface AdvancedSettingsProps {
  channel: Channel;
  supabase: SupabaseClient;
  status: Channel['status'];
}

const VALID_TABS = ['videos', 'profile', 'settings'] as const;
type TabId = typeof VALID_TABS[number];

function resolveTab(raw: string | null): TabId {
  return VALID_TABS.includes(raw as TabId) ? (raw as TabId) : 'videos';
}

export default function ManageChannelClient({ channel, videos: initialVideos }: ManageChannelClientProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentChannel, setCurrentChannel] = useState<Channel>(channel);
  const [videos, setVideos] = useState<Video[]>(initialVideos);

  const initialTab = resolveTab(searchParams.get('tab'));

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
      <div className="relative min-h-full">
        <div className="container mx-auto">
          <Header channel={currentChannel} setChannel={setCurrentChannel} supabase={supabase} />
          <Tabs defaultTab={initialTab} onTabChange={handleTabChange} className="mt-4 sm:mt-8 px-4 sm:px-12">
            <TabPanel id="videos">
              <VideoManager videos={videos} setVideos={setVideos} channelId={channel.id} supabase={supabase} />
            </TabPanel>
            <TabPanel id="profile">
              <ProfileEditor channel={currentChannel} setChannel={setCurrentChannel} supabase={supabase} />
            </TabPanel>
            <TabPanel id="settings">
              <AdvancedSettings channel={currentChannel} supabase={supabase} status={currentChannel.status} />
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
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `${channel.id}/${fileName}`;

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
        <div className="w-full h-40 sm:h-64 relative rounded-b-lg overflow-hidden">
          {bannerPreview || channel.banner_url ? (
              <Image
                  src={bannerPreview || channel.banner_url || ''}
                  alt={`${channel.display_name}'s banner`}
                  fill
                  className="object-cover"
              />
          ) : (
              <div className="w-full h-full bg-secondary" />
          )}
          <label
              htmlFor="bannerUpload"
              className={`absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-black/60 backdrop-blur-sm text-xs text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded cursor-pointer hover:bg-black/80 transition ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        <div className="relative mt-4 px-4 sm:px-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full overflow-hidden relative shrink-0">
              {avatarPreview || channel.avatar_url ? (
                  <Image
                      src={avatarPreview || channel.avatar_url || ''}
                      alt={`${channel.display_name}'s profile picture`}
                      fill
                      className="object-cover"
                  />
              ) : (
                  <div className="grid h-full w-full place-items-center bg-muted text-4xl sm:text-6xl font-bold text-muted-foreground">
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                {channel.display_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                @{channel.handle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {channel.video_count ?? 0} video{channel.video_count === 1 ? '' : 's'} •{' '}
                {channel.follower_count ?? 0} follower{channel.follower_count === 1 ? '' : 's'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="w-full sm:w-auto shrink-0 flex gap-2">
              <Link
                  href={`/channel/${channel.handle}`}
                  className="inline-flex items-center justify-center h-9 sm:h-10 px-4 rounded-full bg-secondary text-sm font-semibold text-secondary-foreground hover:bg-muted transition"
              >
                View Channel
              </Link>
            </div>
          </div>

          {channel.description && (
              <p className="mt-4 max-w-2xl text-sm sm:text-base text-card-foreground">
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

function Tabs({ children, defaultTab, className, onTabChange }: TabsProps) {
  const [active, setActive] = useState<string>(defaultTab);
  const tabs = ['videos', 'profile', 'settings'];

  const handleTabClick = (id: string) => {
    setActive(id);
    onTabChange?.(id);
  };

  return (
      <div className={className}>
        <div className="flex flex-row gap-4 sm:gap-8 mt-6">
          {tabs.map(id => (
              <p
                  key={id}
                  onClick={() => handleTabClick(id)}
                  role="tab"
                  aria-selected={active === id}
                  className={`relative cursor-pointer text-sm sm:text-base transition-all ${
                      active === id
                          ? 'font-bold text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-100 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-110'
                          : 'font-thin text-muted-foreground hover:text-foreground after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100'
                  }`}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </p>
          ))}
        </div>
        <hr className="border-border mt-2"/>

        <div className="pt-6 sm:pt-8">
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
  const [newThumbnailUrl, setNewThumbnailUrl] = useState<string | null>(null);
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

  const deleteVideo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video? This cannot be undone.')) return;

    try {
      setLoading(true);
      const target = videos.find(v => v.id === id);

      if (target?.video_url) {
        const urlParts = target.video_url.split('/');
        const guid = urlParts[urlParts.length - 2];
        const deleteResponse = await fetch(`/api/videos/delete-bunny`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guid }),
        });
        if (!deleteResponse.ok) {
          console.error(`Failed to delete video ${guid} from Bunny.net`);
        }
      }

      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;

      setVideos(videos.filter(v => v.id !== id));
      setSelectedVideos(prev => prev.filter(sid => sid !== id));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error deleting video: ${errorMessage}`);
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

      // Get the videos to be deleted
      const videosToDelete = videos.filter(v => selectedVideos.includes(v.id));

      // Delete videos from Bunny.net
      for (const video of videosToDelete) {
        try {
          // Extract GUID from video_url: https://${pullZone}/${guid}/playlist.m3u8
          if (video.video_url) {
            const urlParts = video.video_url.split('/');
            const guid = urlParts[urlParts.length - 2]; // GUID is before 'playlist.m3u8'

            // Delete from Bunny Stream
            const deleteResponse = await fetch(`/api/videos/delete-bunny`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ guid }),
            });

            if (!deleteResponse.ok) {
              console.error(`Failed to delete video ${guid} from Bunny.net`);
            }
          }
        } catch (bunnyError) {
          console.error('Error deleting from Bunny.net:', bunnyError);
          // Continue even if Bunny deletion fails
          // todo: maybe log this somewhere where admins can see
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
      <div className="space-y-4 sm:space-y-6">
        {selectedVideos.length > 0 && (
            <div className="bg-secondary/50 backdrop-blur-sm rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-border">
          <span className="text-sm text-card-foreground">
            {selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''} selected
          </span>
              <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => bulkUpdateVisibility('public')}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-muted text-white rounded hover:bg-accent hover:text-accent-foreground transition disabled:opacity-50"
                >
                  Make Public
                </button>
                <button
                    onClick={() => bulkUpdateVisibility('private')}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-muted text-white rounded hover:bg-accent hover:text-accent-foreground transition disabled:opacity-50"
                >
                  Make Private
                </button>
                <button
                    onClick={bulkDelete}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-destructive text-white rounded hover:opacity-90 transition disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
        )}

        <div className="flex flex-col gap-2">
          {videos.map(v => (
              <VideoCard
                  key={v.id}
                  video={v}
                  isSelected={selectedVideos.includes(v.id)}
                  onToggleSelect={() => toggleSelect(v.id)}
                  onEdit={() => setEditVideo(v)}
                  onDelete={() => deleteVideo(v.id)}
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

function VideoCard({ video, isSelected, onToggleSelect, onEdit, onDelete }: VideoCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(video.thumbnail_url || '/Stellicast404Thumbnail.png');
  const [copyTooltip, setCopyTooltip] = useState<boolean>(false);

  const formatDuration = (duration: number) => {
    if (!duration || duration <= 0) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatViews = (views: number | null) => {
    const v = views ?? 0;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k views`;
    return `${v} view${v === 1 ? '' : 's'}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/watch/${video.slug}`);
    setCopyTooltip(true);
    setTimeout(() => setCopyTooltip(false), 1500);
  };

  const visibilityBadge = {
    public:   { cls: 'bg-[#1d3a5c] text-[#7ab8f5]', label: 'Public' },
    unlisted: { cls: 'bg-[#3a2e0d] text-[#f0c060]', label: 'Unlisted' },
    private:  { cls: 'bg-[#2a2a2a] text-[#999]',    label: 'Private' },
  }[video.visibility];

  return (
      <div
          className={`flex items-center gap-3 bg-card border rounded-xl px-3 py-2.5 transition-colors ${
              isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-muted-foreground/40'
          }`}
      >
        {/* -------- Checkbox -------- */}
        <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            aria-label={`Select ${video.title}`}
            className="shrink-0 accent-primary cursor-pointer"
            onClick={e => e.stopPropagation()}
        />

        {/* -------- Thumbnail -------- */}
        <div className="relative shrink-0 w-28 rounded-md overflow-hidden bg-secondary" style={{ aspectRatio: '16/9' }}>
          <Image
              src={imgSrc}
              alt={video.title}
              fill
              className="object-cover"
              onError={() => setImgSrc('/Stellicast404Thumbnail.png')}
          />
          <span className="absolute top-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
          {formatDuration(video.duration)}
        </span>
        </div>

        {/* -------- Info -------- */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{video.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium leading-none ${visibilityBadge.cls}`}>
            {visibilityBadge.label}
          </span>
            {video.is_ai && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-none bg-[#2d1f4e] text-[#a78cf5]">
              AI
            </span>
            )}
            <span className="text-[11px] text-muted-foreground">
            {formatViews(video.view_count)} · {formatDate(video.created_at)}
          </span>
          </div>
        </div>

        {/* -------- Action buttons -------- */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
              href={`/watch/${video.slug}`}
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center justify-center rounded-md border border-border bg-transparent p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Watch video"
              title="Watch"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </Link>

          <div className="relative">
            <button
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center rounded-md border border-border bg-transparent p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Copy link"
                title="Copy link"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            </button>
            {copyTooltip && (
                <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background">
              Copied!
            </span>
            )}
          </div>

          <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="inline-flex items-center justify-center rounded-md border border-border bg-transparent p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label={`Edit ${video.title}`}
              title="Edit"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="inline-flex items-center justify-center rounded-md border border-destructive/50 bg-transparent p-1.5 text-destructive/70 transition hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
              aria-label={`Delete ${video.title}`}
              title="Delete"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a1 1 0 011-1h2a1 1 0 011 1v2" />
            </svg>
          </button>
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

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [newThumbnailUrl, setNewThumbnailUrl] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(video.thumbnail_url ?? null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  const [assignedSectors, setAssignedSectors] = useState<AssignedSector[]>([]);
  const [loadingSectors, setLoadingSectors] = useState<boolean>(true);
  const [sectorError, setSectorError] = useState<string | null>(null);
  const [sectorActionId, setSectorActionId] = useState<string | null>(null);

  const [sectorQuery, setSectorQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SectorSearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const loadSectors = async () => {
      try {
        setLoadingSectors(true);
        const res = await fetch(`/api/videos/${video.id}/sectors`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load sectors');
        if (!cancelled) setAssignedSectors(json.sectors ?? []);
      } catch (error) {
        if (!cancelled) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setSectorError(errorMessage);
        }
      } finally {
        if (!cancelled) setLoadingSectors(false);
      }
    };

    loadSectors();
    return () => { cancelled = true; };
  }, [video.id]);

  // -------- debounced sector search --------
  useEffect(() => {
    const query = sectorQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/sectors/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Search failed');
        if (!cancelled) setSearchResults(json.sectors ?? []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [sectorQuery]);

  const assignedIds = new Set(assignedSectors.map(s => s.id));
  const visibleResults = searchResults.filter(s => !assignedIds.has(s.id));

  const handleAddSector = async (sector: SectorSearchResult) => {
    try {
      setSectorActionId(sector.id);
      const res = await fetch(`/api/videos/${video.id}/sectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector_id: sector.id }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || 'Failed to add sector');

      setAssignedSectors(prev => {
        const withoutMisc = json.removed_misc_sector_id
            ? prev.filter(s => s.id !== json.removed_misc_sector_id)
            : prev;
        return [...withoutMisc, {
          id: sector.id,
          name: sector.name,
          slug: sector.slug,
          icon: sector.icon,
          approval_status: json.approval_status,
        }];
      });
      setSectorQuery('');
      setSearchResults([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error adding sector: ${errorMessage}`);
    } finally {
      setSectorActionId(null);
    }
  };

  const handleRemoveSector = async (sectorId: string) => {
    try {
      setSectorActionId(sectorId);
      const res = await fetch(`/api/videos/${video.id}/sectors`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector_id: sectorId }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || 'Failed to remove sector');

      setAssignedSectors(prev => prev.filter(s => s.id !== sectorId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error removing sector: ${errorMessage}`);
    } finally {
      setSectorActionId(null);
    }
  };

  const handleThumbnailChange = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Thumbnail must be a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Thumbnail must be under 5 MB.');
      return;
    }

    // Show a local preview immediately
    setThumbnailPreview(URL.createObjectURL(file));
    setThumbnailFile(file);
    setUploadingThumbnail(true);

    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      const res = await fetch(`/api/videos/${video.id}/thumbnail`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || 'Upload failed');

      // Update the displayed URL to the persisted one (includes cache-buster)
      setThumbnailPreview(json.thumbnail_url);
      setNewThumbnailUrl(json.thumbnail_url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`Thumbnail upload failed: ${msg}`);
      // Revert preview to original
      setThumbnailPreview(video.thumbnail_url ?? null);
      setThumbnailFile(null);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleSubmit = async () => {
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

      if (error)
        throw error;

      onUpdate({ ...(data as Video), thumbnail_url: newThumbnailUrl ?? data.thumbnail_url });
      alert('Video updated successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error updating video: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-10" onClick={onClose}>
        <div className="bg-card rounded-lg max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-border" onClick={e => e.stopPropagation()}>
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">Edit Video</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="video-title" className="block text-sm font-medium text-card-foreground mb-1">Title</label>
              <input
                  id="video-title"
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="w-full rounded-md bg-input border border-border text-foreground placeholder-muted-foreground px-3 py-2 text-sm sm:text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  required
              />
            </div>

            <div>
              <label htmlFor="video-description" className="block text-sm font-medium text-card-foreground mb-1">Description</label>
              <textarea
                  id="video-description"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-md bg-input border border-border text-foreground placeholder-muted-foreground px-3 py-2 text-sm sm:text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                  placeholder="Add a description for your video..."
              />
            </div>

            <div>
              <label htmlFor="visibility" className="block text-sm font-medium text-card-foreground mb-1">Visibility</label>
              <select
                  id="visibility"
                  value={form.visibility}
                  onChange={e => setForm({ ...form, visibility: e.target.value as 'public' | 'private' | 'unlisted' })}
                  className="w-full rounded-md bg-input border border-border text-foreground px-3 py-2 text-sm sm:text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
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
                  className="w-4 h-4 rounded accent-primary"
              />
              <label htmlFor="is_ai" className="text-sm text-card-foreground">Contains AI content</label>
            </div>

            {/* -------- Thumbnail -------- */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Thumbnail</label>
              <div className="flex items-start gap-3">
                <div className="relative w-40 shrink-0 rounded-md overflow-hidden border border-border bg-secondary aspect-video">
                  {thumbnailPreview ? (
                      <img
                          src={thumbnailPreview}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                      />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        No thumbnail
                      </div>
                  )}
                  {uploadingThumbnail && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                      type="button"
                      disabled={uploadingThumbnail}
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-medium rounded bg-secondary text-secondary-foreground hover:bg-muted transition disabled:opacity-50"
                  >
                    {uploadingThumbnail ? 'Uploading...' : 'Change thumbnail'}
                  </button>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP - max 5 MB</p>
                </div>
              </div>
              <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleThumbnailChange(file);
                    e.target.value = '';
                  }}
                  className="hidden"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">Sectors</label>

              {loadingSectors ? (
                  <p className="text-sm text-muted-foreground">Loading sectors...</p>
              ) : sectorError ? (
                  <p className="text-sm text-destructive">{sectorError}</p>
              ) : (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {assignedSectors.length === 0 && (
                        <p className="text-sm text-muted-foreground">Not in any sectors yet.</p>
                    )}
                    {assignedSectors.map(s => (
                        <span
                            key={s.id}
                            className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground"
                        >
                    {s.name}
                          {s.approval_status === 'pending' && (
                              <span className="text-yellow-400">(pending)</span>
                          )}
                          {s.approval_status === 'rejected' && (
                              <span className="text-destructive">(rejected)</span>
                          )}
                          <button
                              type="button"
                              onClick={() => handleRemoveSector(s.id)}
                              disabled={sectorActionId === s.id}
                              className="text-muted-foreground hover:text-destructive transition disabled:opacity-50"
                              aria-label={`Remove from ${s.name}`}
                          >
                      ×
                    </button>
                  </span>
                    ))}
                  </div>
              )}

              <div className="relative">
                <input
                    type="text"
                    value={sectorQuery}
                    onChange={e => setSectorQuery(e.target.value)}
                    placeholder="Search sectors to add..."
                    className="w-full rounded-md bg-input border border-border text-foreground placeholder-muted-foreground px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                />

                {sectorQuery.trim() && (
                    <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                      {searching ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
                      ) : visibleResults.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">No matching sectors.</p>
                      ) : (
                          visibleResults.map(s => (
                              <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => handleAddSector(s)}
                                  disabled={sectorActionId === s.id}
                                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-left text-card-foreground hover:bg-secondary transition disabled:opacity-50"
                              >
                                <span>{s.name}</span>
                                <span className="text-xs text-muted-foreground">s/{s.slug}</span>
                              </button>
                          ))
                      )}
                    </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary rounded hover:bg-muted transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary rounded hover:bg-accent hover:text-accent-foreground transition hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
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
      <div className="max-w-2xl space-y-4 sm:space-y-6">
        <div>
          <label htmlFor="display_name" className="block text-sm font-medium text-card-foreground mb-1">
            Display name
          </label>
          <input
              id="display_name"
              name="display_name"
              type="text"
              value={form.display_name}
              onChange={handleChange}
              className="block w-full rounded-md bg-input border border-border text-foreground placeholder-muted-foreground px-3 py-2 text-sm sm:text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-card-foreground mb-1">
            Description
          </label>
          <textarea
              id="description"
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              className="block w-full rounded-md bg-input border border-border text-foreground placeholder-muted-foreground px-3 py-2 text-sm sm:text-base focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="h-9 sm:h-10 px-6 bg-primary text-primary-foreground text-sm font-semibold rounded-full hover:bg-accent hover:text-accent-foreground transition hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Update profile'}
          </button>
        </div>
      </div>
  );
}

function AdvancedSettings({ channel, supabase, status }: AdvancedSettingsProps) {
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
        ...(data as Video[]).map(v =>
            [
              `"${v.title}"`,
              v.view_count,
              v.like_count,
              v.dislike_count,
              v.star_count,
              v.created_at,
              v.visibility,
            ].join(',')
        ),
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

      const res = await fetch(`/api/account/channels/${channel.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      window.location.href = '/';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error deleting channel: ${errorMessage}`);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
      <div className="max-w-2xl space-y-4 sm:space-y-6">

        {/* -------- Early access notice -------- */}
        {status !== 'active' && (
            <div className={`p-4 rounded-lg border-2 ${
                status === 'pending'
                    ? 'bg-yellow-500/10 border-yellow-500/40'
                    : 'bg-destructive/10 border-destructive/40'
            }`}>
              <div className="flex items-start gap-3">
                <svg className={`w-5 h-5 shrink-0 mt-0.5 ${status === 'pending' ? 'text-yellow-500' : 'text-destructive'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${status === 'pending' ? 'text-yellow-500' : 'text-destructive'}`}>
                    {status === 'pending' ? 'Application Under Review' : 'Channel Not Active'}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {status === 'pending'
                        ? 'Your early access application is pending review. Uploading will be unlocked once approved.'
                        : 'This channel is not approved for early access. Apply to unlock video uploads.'
                    }
                  </p>
                  {status !== 'pending' && (
                      <Link
                          href={`/channel/${channel.handle}/early-access`}
                          className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-lg transition-colors"
                      >
                        Apply for Early Access
                      </Link>
                  )}
                </div>
              </div>
            </div>
        )}

        {/* -------- Export analytics -------- */}
        <div className="p-4 bg-card/50 rounded-lg border border-border">
          <h3 className="text-sm font-medium text-foreground mb-2">Analytics Export</h3>
          <p className="text-xs text-muted-foreground mb-4">Download your channel analytics and metrics</p>
          <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-success text-white text-sm font-medium rounded hover:opacity-90 transition"
              aria-label="Export analytics"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export analytics (CSV)
          </button>
        </div>

        {/* Danger Zone */}
        <div className="p-4 bg-destructive/10 border border-destructive/50 rounded-lg">
          <h3 className="text-sm font-medium text-destructive mb-2">Danger Zone</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Delete your channel permanently. All videos and data will be removed. This action cannot be undone.
          </p>
          <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-destructive text-white text-sm font-medium rounded hover:opacity-90 transition"
          >
            Delete channel
          </button>

          {showDeleteConfirm && (
              <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                  onClick={() => setShowDeleteConfirm(false)}
              >
                <div
                    className="bg-card rounded-lg max-w-md w-full p-4 sm:p-6 shadow-2xl border border-border"
                    onClick={e => e.stopPropagation()}
                >
                  <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Delete Channel?</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    This will permanently delete your channel, all videos, and data. This action cannot be undone.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary rounded hover:bg-muted transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-semibold text-white bg-destructive rounded hover:opacity-90 transition disabled:opacity-50"
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
