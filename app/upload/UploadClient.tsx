'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import VideoUpload from '@/components/VideoUpload';
import {
  CloudArrowUpIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  PlusIcon,
  LockClosedIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';

interface Channel {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  channel_type: string;
  status: 'active' | 'frozen' | 'pending';
}

// -------- Small helpers --------

function ChannelAvatar({ channel, size = 32 }: { channel: Channel; size?: number }) {
  if (channel.avatar_url) {
    return (
        <Image
            src={channel.avatar_url}
            alt={channel.display_name}
            width={size}
            height={size}
            className="rounded-full object-cover"
            style={{ width: size, height: size }}
        />
    );
  }
  return (
      <div
          className="rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-primary-foreground shrink-0"
          style={{ width: size, height: size }}
      >
        {channel.display_name[0].toUpperCase()}
      </div>
  );
}

function StatusBadge({ status }: { status: Channel['status'] }) {
  if (status === 'active') return null;
  return (
      <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${
              status === 'pending'
                  ? 'bg-yellow-500/15 text-yellow-500'
                  : 'bg-destructive/15 text-destructive'
          }`}
      >
      {status}
    </span>
  );
}

function FrozenChannelNotice({ channel }: { channel: Channel }) {
  const isPending = channel.status === 'pending';
  return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <LockClosedIcon className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">
          {isPending ? 'Application Under Review' : 'Channel Not Active'}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {isPending
              ? "Your early access application is pending review. You'll be able to upload once it's approved."
              : "This channel hasn't been approved for early access yet. Apply to start uploading."}
        </p>
        {!isPending && (
            <Link
                href={`/channel/${channel.handle}/early-access`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold transition-colors"
            >
              Apply for Early Access
            </Link>
        )}
      </div>
  );
}

// -------- Publishing checklist --------

/**
 * Receives checklist items from the parent (which proxies them out of VideoUpload
 * via a callback). Until a real callback wires them up, the component degrades
 * gracefully — all items stay unchecked.
 */
function PublishingChecklist({ items }: {
  items: { label: string; done: boolean }[];
}) {
  return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <CheckCircleIcon className="w-5 h-5 text-accent" />
          Publishing Checklist
        </h3>
        <ul className="space-y-3">
          {items.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 text-sm">
            <span
                className={`flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors shrink-0 ${
                    item.done
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-border text-transparent'
                }`}
            >
              {item.done && (
                  <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
              )}
            </span>
                <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
              </li>
          ))}
        </ul>
      </div>
  );
}

// -------- Main upload content --------

function UploadContent() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChannelId = searchParams.get('channel');

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  // Checklist state lifted out of VideoUpload (VideoUpload calls back via onChecklistChange)
  const [checklist, setChecklist] = useState([
    { label: 'Video selected', done: false },
    { label: 'Title added', done: false },
    { label: 'Thumbnail added', done: false },
    { label: 'Sector selected', done: false },
  ]);

  useEffect(() => {
    const initUpload = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth?next=/upload'); return; }

      const { data: userChannels, error } = await supabase
          .from('channels')
          .select('id, display_name, handle, avatar_url, channel_type, status')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

      if (error) { console.error('Error fetching channels:', error); setLoading(false); return; }

      const allChannels = (userChannels ?? []) as Channel[];
      setChannels(allChannels);

      if (urlChannelId) {
        setSelectedChannel(allChannels.find(ch => ch.id === urlChannelId) ?? allChannels[0] ?? null);
      } else {
        setSelectedChannel(allChannels.find(ch => ch.status === 'active') ?? allChannels[0] ?? null);
      }
      setLoading(false);
    };
    initUpload();
  }, [router, urlChannelId]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    setShowChannelDropdown(false);
    router.push(`/upload?channel=${channel.id}`, { scroll: false });
  };

  // ── Loading / empty states ───────────────────────────────────────────────────

  if (loading) {
    return (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
    );
  }

  if (channels.length === 0) {
    return (
        <div className="max-w-md mx-auto mt-20 p-8 bg-card border border-border rounded-2xl text-center">
          <CloudArrowUpIcon className="w-12 h-12 text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-foreground">No Channels Found</h2>
          <p className="text-muted-foreground mb-6">You need to create a channel before you can upload videos.</p>
          <Link
              href="/account"
              className="inline-flex items-center justify-center gap-2 w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold transition-colors"
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
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
    );
  }

  const isBlocked = selectedChannel.status !== 'active';

  // -------- Layout --------

  return (
      <div className="max-w-7xl mx-auto w-full py-8 px-4 overflow-x-hidden">

        {/* -------- Page header -------- */}
        <div className="mb-8 space-y-5">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
            <CloudArrowUpIcon className="w-8 h-8 text-accent" />
            Upload Video
          </h1>

          {/* Channel selector + identity strip */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Uploading to
              </label>
              <button
                  onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                  className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-xl hover:border-accent/50 transition text-foreground min-w-[260px]"
              >
                <ChannelAvatar channel={selectedChannel} size={36} />
                <div className="text-left flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{selectedChannel.display_name}</p>
                    <StatusBadge status={selectedChannel.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">@{selectedChannel.handle}</p>
                </div>
                <ChevronDownIcon
                    className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${showChannelDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              {showChannelDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowChannelDropdown(false)} />
                    <div className="absolute top-full left-0 mt-2 min-w-[260px] bg-card border border-border rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto">
                      {channels.map((channel) => (
                          <button
                              key={channel.id}
                              onClick={() => handleChannelSelect(channel)}
                              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition text-foreground ${
                                  selectedChannel.id === channel.id ? 'bg-muted/50' : ''
                              }`}
                          >
                            <ChannelAvatar channel={channel} size={32} />
                            <div className="text-left flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground truncate">{channel.display_name}</p>
                                <StatusBadge status={channel.status} />
                              </div>
                              <p className="text-xs text-muted-foreground">@{channel.handle}</p>
                            </div>
                            {selectedChannel.id === channel.id && (
                                <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                            )}
                          </button>
                      ))}
                    </div>
                  </>
              )}
            </div>
          </div>
        </div>

        {/* -------- Blocked state -------- */}
        {isBlocked ? (
            <FrozenChannelNotice channel={selectedChannel} />
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

              {/* ── Main upload area (2/3) ── */}
              <div className="md:col-span-2">
                <div className="bg-card border border-border rounded-2xl p-3 sm:p-6 shadow-sm overflow-hidden min-w-0">
              <VideoUpload channelId={selectedChannel.id} onChecklistChange={setChecklist} />
                </div>
              </div>

              {/* ── Sidebar (1/3) ── */}
              <div className="space-y-5 md:sticky md:top-6">

                {/* Publishing checklist */}
                <PublishingChecklist items={checklist} />

                {/* Upload guidelines */}
                <div className="bg-accent/5 border border-accent/20 rounded-2xl p-5">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-accent">
                    <ShieldCheckIcon className="w-5 h-5" />
                    Upload Guidelines
                  </h3>
                  <ul className="text-xs text-muted-foreground space-y-3">
                    <li className="flex gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      Ensure you own the rights to everything you upload.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      Videos must comply with our community standards.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      AI-generated content must be disclosed during upload.
                    </li>
                  </ul>
                </div>

                {/* File requirements */}
                <div className="bg-secondary border border-border rounded-2xl p-5">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3 text-foreground">
                    <InformationCircleIcon className="w-5 h-5 text-muted-foreground" />
                    File Requirements
                  </h3>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Max size</span>
                      <span className="text-secondary-foreground font-medium">2 GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Formats</span>
                      <span className="text-secondary-foreground font-medium">MP4, MOV, WebM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Resolution</span>
                      <span className="text-secondary-foreground font-medium">Up to 4K</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}

export default function UploadPage() {
  return (
      <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }
      >
        <UploadContent />
      </Suspense>
  );
}
