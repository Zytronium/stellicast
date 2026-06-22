'use client';

import { useState, useEffect } from 'react';
import { Plus, Upload, Settings, ClipboardList, TvMinimal, Users, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createSupabaseBrowserClient } from '../../lib/supabase-client';
import Link from 'next/link';

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
  status?: 'active' | 'frozen' | 'pending';
};

function ChannelAvatar({ channel, size = 56 }: { channel: Channel; size?: number }) {
  if (channel.avatar_url) {
    return (
        <Image
            src={channel.avatar_url}
            alt={channel.display_name}
            width={size}
            height={size}
            className="rounded-full object-cover shrink-0"
            style={{ width: size, height: size }}
        />
    );
  }
  return (
      <div
          className="rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-primary-foreground shrink-0"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {channel.display_name[0].toUpperCase()}
      </div>
  );
}

function StatusBadge({ status }: { status?: Channel['status'] }) {
  if (!status || status === 'active') return null;
  return (
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${
          status === 'pending'
              ? 'bg-yellow-500/15 text-yellow-500'
              : 'bg-destructive/15 text-destructive'
      }`}>
      {status}
    </span>
  );
}

function ChannelCard({ channel }: { channel: Channel }) {
  const router = useRouter();
  const isBlocked = channel.status && channel.status !== 'active';

  return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-accent/30 transition-colors group">
        {/* Banner */}
        <div className="h-20 bg-linear-to-br from-primary/20 to-accent/20 relative">
          {channel.banner_url && (
              <Image src={channel.banner_url} alt="" fill className="object-cover" />
          )}
        </div>

        <div className="px-5 pb-5">
          {/* Avatar overlapping banner */}
          <div className="relative -mt-7 mb-3 flex items-end justify-between">
            <Link className="bg-card ring-4 ring-card rounded-full" href={`/channel/${channel.handle}`}>
              <ChannelAvatar channel={channel} size={56} />
            </Link>
            <div className="flex items-center gap-1.5 pt-2">
              <StatusBadge status={channel.status} />
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide">
              {channel.channel_type}
            </span>
            </div>
          </div>

          {/* Name + handle */}
          <Link className="mb-1" href={`/channel/${channel.handle}`}>
            <h3 className="font-semibold text-foreground truncate">{channel.display_name}</h3>
            <p className="text-xs text-muted-foreground mb-1">@{channel.handle}</p>
          </Link>

          {channel.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{channel.description}</p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Video className="w-3.5 h-3.5" />
            {channel.video_count.toLocaleString()} videos
          </span>
            <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
              {channel.follower_count.toLocaleString()} followers
          </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
                onClick={() => router.push(`/upload?channel=${channel.id}`)}
                disabled={!!isBlocked}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </button>
            <button
                onClick={() => router.push(`/channel/${channel.handle}/manage`)}
                className="flex items-center justify-center gap-2 px-3 py-2 border border-border text-muted-foreground text-xs font-medium rounded-xl hover:bg-muted hover:text-foreground transition-colors"
                title="Manage channel"
            >
              <Settings className="w-3.5 h-3.5" />
              Manage
            </button>
          </div>
        </div>
      </div>
  );
}

export default function ChannelsPage() {
  const supabase = createSupabaseBrowserClient();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  // TODO: Uncomment when channels are no longer early-access
  // const [showCreateModal, setShowCreateModal] = useState(false);
  // const [creating, setCreating] = useState(false);
  // const [channelType, setChannelType] = useState<'creator' | 'studio'>('creator');
  // const [displayName, setDisplayName] = useState('');
  // const [handle, setHandle] = useState('');
  // const [description, setDescription] = useState('');
  // const [website, setWebsite] = useState('');
  // const [companyName, setCompanyName] = useState('');
  // const [businessEmail, setBusinessEmail] = useState('');

  // const resetForm = () => {
  //   setDisplayName('');
  //   setHandle('');
  //   setDescription('');
  //   setWebsite('');
  //   setCompanyName('');
  //   setBusinessEmail('');
  // };

  // const handleCreateChannel = async () => {
  //   if (!displayName || !handle) {
  //     alert('Please fill in required fields');
  //     return;
  //   }
  //   if (channelType === 'studio' && !companyName) {
  //     alert('Company name is required for studio channels');
  //     return;
  //   }
  //   setCreating(true);
  //   try {
  //     const payload: any = {
  //       channel_type: channelType,
  //       display_name: displayName,
  //       handle: handle.toLowerCase().replace(/[^a-z0-9_]/g, ''),
  //       description,
  //     };
  //     if (channelType === 'creator') {
  //       payload.website = website;
  //     } else {
  //       payload.company_name = companyName;
  //       payload.business_email = businessEmail;
  //     }
  //     const res = await fetch('/api/account/channels/create', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload),
  //     });
  //     if (!res.ok) {
  //       const error = await res.json();
  //       throw new Error(error.error || 'Failed to create channel');
  //     }
  //     await loadChannels();
  //     setShowCreateModal(false);
  //     resetForm();
  //   } catch (error: any) {
  //     alert(error.message);
  //   } finally {
  //     setCreating(false);
  //   }
  // };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/account/channels');
        if (res.ok) {
          const data = await res.json();
          setChannels(data.channels || []);
        }
      } catch (err) {
        console.error('Failed to load channels:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
    );
  }

  return (
      <>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Channels</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your creator and studio channels</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
                href="/applications"
                className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-medium text-foreground rounded-xl hover:bg-muted transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              Applications
            </Link>
            <Link
                href="/channels/apply"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Apply for Channel
            </Link>
            {/* TODO: Uncomment when channels are no longer early-access; also remove the Apply links above */}
            {/* <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Channel
          </button> */}
          </div>
        </div>

        {/* Channel grid */}
        {channels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((channel) => (
                  <ChannelCard key={channel.id} channel={channel} />
              ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <TvMinimal className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1">No channels yet</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                Apply to create a channel and start sharing your content on Stellicast.
              </p>
              <Link
                  href="/channels/apply"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Apply to Create Your First Channel
              </Link>
              <p className="text-xs text-muted-foreground mt-4">
                Already applied?{' '}
                <Link href="/applications" className="text-accent hover:underline">
                  Check your application status
                </Link>
              </p>
            </div>
        )}
      </div>

  {/* TODO: Uncomment when channels are no longer early-access */}
  {/* {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border-t sm:border border-border">
            <div className="p-4 sm:p-6 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">Create New Channel</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-muted-foreground hover:text-foreground text-3xl sm:text-2xl leading-none -mt-1"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
              Channel Type
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Channel Type</label>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => setChannelType('creator')}
                    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition ${
                      channelType === 'creator'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted'
                    }`}
                  >
                    <h3 className="font-semibold mb-1 text-sm sm:text-base text-foreground">Creator</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">For individual content creators</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelType('studio')}
                    className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition ${
                      channelType === 'studio'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted'
                    }`}
                  >
                    <h3 className="font-semibold mb-1 text-sm sm:text-base text-foreground">Studio</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">For production companies & teams</p>
                  </button>
                </div>
              </div>

              Display Name
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Display Name *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="My Awesome Channel"
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 sm:py-2 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                />
              </div>

              Handle
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Handle *</label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm sm:text-base">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="mychannel"
                    className="flex-1 bg-input border border-border rounded-lg px-4 py-2.5 sm:py-2 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Only lowercase letters, numbers, and underscores</p>
              </div>

              Description
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your channel..."
                  rows={4}
                  className="w-full bg-input border border-border rounded-lg px-4 py-2.5 sm:py-2 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              Creator-specific fields
              {channelType === 'creator' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-foreground">Website</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-input border border-border rounded-lg px-4 py-2.5 sm:py-2 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                  />
                </div>
              )}

              Studio-specific fields
              {channelType === 'studio' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Company Name *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Studios Inc."
                      className="w-full bg-input border border-border rounded-lg px-4 py-2.5 sm:py-2 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Business Email</label>
                    <input
                      type="email"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder="contact@company.com"
                      className="w-full bg-input border border-border rounded-lg px-4 py-2.5 sm:py-2 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </>
              )}

              Actions
              <div className="flex gap-3 pt-2 sm:pt-4 pb-2 sm:pb-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 sm:py-2 border border-border text-muted-foreground text-sm rounded-lg hover:bg-muted hover:text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateChannel}
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 sm:py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-accent hover:text-accent-foreground disabled:bg-muted disabled:text-muted-foreground transition"
                >
                  {creating ? 'Creating...' : 'Create Channel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )} */}
      </>
);
}
