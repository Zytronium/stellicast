'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CloudArrowUpIcon,
  InformationCircleIcon,
  PhotoIcon,
  TagIcon,
  EyeIcon,
  SparklesIcon,
  CheckCircleIcon as CheckCircleOutline,
  GlobeAltIcon,
  LinkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/20/solid';
import VideoPlayer from '@/components/VideoPlayer';
import SectorSelector from '@/components/SectorSelector';

type VideoPreview = {
  file: File;
  url: string;
  duration: number;
  size: string;
};

interface Sector {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  allow_ai: boolean;
  min_video_length: number;
  max_video_length: number;
  approval_for_posting: boolean;
}

function hasSectorViolation(sector: Sector, isAI: boolean, videoDuration?: number): boolean {
  if (isAI && !sector.allow_ai) return true;
  if (videoDuration !== undefined) {
    if (sector.min_video_length > 0 && videoDuration < sector.min_video_length) return true;
    if (videoDuration > sector.max_video_length) return true;
  }
  return false;
}

// -------- Small helpers --------

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
          <span className="text-accent w-4 h-4">{icon}</span>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <div className="p-5 space-y-4">{children}</div>
      </div>
  );
}

const VISIBILITY_OPTIONS = [
  {
    value: 'public' as const,
    label: 'Public',
    Icon: GlobeAltIcon,
    description: 'Visible to everyone',
  },
  {
    value: 'unlisted' as const,
    label: 'Unlisted',
    Icon: LinkIcon,
    description: 'Only people with a link',
  },
  {
    value: 'private' as const,
    label: 'Private',
    Icon: LockClosedIcon,
    description: 'Only you can watch',
  },
];

// -------- Main component --------

export default function VideoUpload({
                                      channelId,
                                      onChecklistChange,
                                    }: {
  channelId?: string;
  onChecklistChange?: (items: { label: string; done: boolean }[]) => void;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [videoPreview, setVideoPreview] = useState<VideoPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadCompleted, setUploadCompleted] = useState(false);

  const [videoId, setVideoId] = useState<string | null>(null);
  const [uploadedSlug, setUploadedSlug] = useState<string | null>(null);
  const [pendingSlugs, setPendingSlugs] = useState<string[]>([]);
  const uploadTargetRef = useRef<any>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [isAI, setIsAI] = useState(false);

  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const [selectedSectors, setSelectedSectors] = useState<Sector[]>([]);
  const [isTest, setIsTest] = useState(false);

  const hasViolations = selectedSectors.some(s =>
      hasSectorViolation(s, isAI, videoPreview?.duration),
  );
  const someNeedApproval = selectedSectors.some(s => s.approval_for_posting);

  // Sync checklist to parent whenever the relevant values change
  useEffect(() => {
    onChecklistChange?.([
      { label: 'Video selected', done: !!videoPreview },
      { label: 'Title added', done: title.trim().length > 0 },
      { label: 'Thumbnail added', done: !!thumbnailPreview },
      { label: 'Sector selected', done: selectedSectors.some(s => s.slug !== 'misc') },
    ]);
  }, [videoPreview, title, thumbnailPreview, selectedSectors]);

  // -------- Tag helpers --------

  const addTag = (tagText: string) => {
    const trimmed = tagText.trim();
    if (!trimmed) return;
    if (tags.map(t => t.toLowerCase()).includes(trimmed.toLowerCase())) {
      setInputValue('');
      return;
    }
    setTags(prev => [...prev, trimmed]);
    setInputValue('');
  };
  const removeTag = (index: number) => setTags(prev => prev.filter((_, i) => i !== index));
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(inputValue); }
    else if (e.key === 'Backspace' && !inputValue && tags.length > 0) setTags(tags.slice(0, -1));
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.includes(',')) {
      const parts = value.split(',');
      parts.slice(0, -1).forEach(part => addTag(part));
      setInputValue(parts[parts.length - 1]);
    } else {
      setInputValue(value);
    }
  };

  // -------- File helpers --------

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('video/')) { alert('Please select a valid video file'); return; }
    if (file.size > 2 * 1024 * 1024 * 1024) { alert('File size must be less than 2GB'); return; }
    const url = URL.createObjectURL(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      const dur = isFinite(videoEl.duration) ? Math.floor(videoEl.duration) : 0;
      setVideoPreview({ file, url, duration: dur, size: formatFileSize(file.size) });
    };
    videoEl.src = url;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview.url);
    setVideoPreview(null);
    setUploadProgress(0);
    clearThumbnail();
    setUploadStage('');
    setUploading(false);
    setUploadCompleted(false);
    setPendingSlugs([]);
    setUploadedSlug(null);
    uploadTargetRef.current = null;
    setVideoId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearThumbnail = () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const handleThumbnailSelect = (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) { alert('Thumbnail must be a JPEG, PNG, or WebP image.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Thumbnail must be under 5 MB.'); return; }
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  // -------- Upload flow --------

  const startUploadFlow = async (
      file: File,
      durationSeconds: number,
      sectorIds: string[],
  ): Promise<{ success: boolean; videoId: string | null; videoSlug: string | null; pendingSlugs: string[] }> => {
    if (!channelId) { alert('Please select a channel before uploading.'); return { success: false, videoId: null, videoSlug: null, pendingSlugs: [] }; }
    setUploading(true);
    setUploadProgress(5);
    setUploadStage('Creating upload record...');
    try {
      const createRes = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId,
          title: title.trim(),
          description: description.trim(),
          visibility,
          is_ai: isAI,
          is_promotional: false,
          tags,
          filename: file.name,
          filesize: file.size,
          duration: durationSeconds,
          auto_upload: true,
          sector_ids: sectorIds,
        }),
      });
      if (!createRes.ok) throw new Error((await createRes.text().catch(() => '')) || 'Failed to initialize upload');
      const createJson = await createRes.json();
      const id = createJson.videoId || createJson.id || createJson.video_id;
      const slug = createJson.slug ?? null;
      const resultPendingSlugs: string[] = createJson.pendingSectorSlugs ?? [];
      setVideoId(id || null);
      const uploadUrl = createJson.uploadUrl || createJson.upload_url;
      const guid = createJson.guid;
      const libraryId = createJson.libraryId || createJson.library_id;
      const apiKey = createJson.apiKey || createJson.api_key;
      uploadTargetRef.current = { uploadUrl, guid, libraryId, apiKey };
      setUploadProgress(15);
      setUploadStage('Uploading file...');
      await Promise.all([
        uploadFileWithProgress(file, uploadTargetRef.current),
        thumbnailFile ? uploadThumbnail(id, thumbnailFile) : Promise.resolve(),
      ]);
      setUploadProgress(100);
      setUploadStage('Upload complete');
      setUploading(false);
      setUploadCompleted(true);
      if (id) {
        await fetch(`/api/videos/${id}/metadata`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), description: description.trim(), visibility, is_ai: isAI, is_promotional: false, tags, duration: durationSeconds }),
        }).catch(err => console.error('Failed to patch metadata after upload', err));
      }
      return { success: true, videoId: id ?? null, videoSlug: slug, pendingSlugs: resultPendingSlugs };
    } catch (err: any) {
      console.error('Upload flow error', err);
      alert(err?.message || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
      setUploadStage('');
      uploadTargetRef.current = null;
      setVideoId(null);
      return { success: false, videoId: null, videoSlug: null, pendingSlugs: [] };
    }
  };

  const uploadFileWithProgress = (file: File, target: any) =>
      new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 80) + 15);
        });
        xhr.addEventListener('load', () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed with status ${xhr.status}`))));
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        if (target?.uploadUrl) { try { xhr.open('PUT', target.uploadUrl, true); } catch (e) { reject(e); return; } }
        else if (target?.libraryId && target?.apiKey && target?.guid) {
          xhr.open('PUT', `https://video.bunnycdn.com/library/${target.libraryId}/videos/${target.guid}`, true);
          xhr.setRequestHeader('AccessKey', target.apiKey);
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        } else { reject(new Error('No upload target available')); return; }
        xhr.send(file);
      });

  const uploadThumbnail = async (videoId: string, file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('thumbnail', file);
    const res = await fetch(`/api/videos/${videoId}/thumbnail`, { method: 'POST', body: formData });
    if (!res.ok) console.warn('[upload] Thumbnail upload failed:', await res.text().catch(() => ''));
  };

  const handlePublish = async () => {
    if (!channelId) { alert('Please select a channel before publishing.'); return; }
    if (!title.trim()) { alert('Please provide a title.'); return; }
    if (!videoPreview) { alert('Please select a video file to upload.'); return; }
    if (hasViolations) { alert('Please resolve the sector issues shown above before publishing.'); return; }
    const { success, videoId: uploadedId, videoSlug, pendingSlugs: resultPendingSlugs } =
        await startUploadFlow(videoPreview.file, videoPreview.duration, selectedSectors.map(s => s.id));
    if (!success || !uploadedId) return;
    setPendingSlugs(resultPendingSlugs);
    setUploadedSlug(videoSlug);
  };

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview.url);
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, []);

  // -------- STAGE 1: No video selected --------

  if (!videoPreview) {
    return (
        <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`
          flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed
          cursor-pointer transition-all duration-200 py-20 px-8 text-center
          ${isDragging
                ? 'border-accent bg-accent/10 scale-[1.01]'
                : 'border-border hover:border-accent/50 hover:bg-accent/5'
            }
        `}
        >
          <input ref={fileInputRef} type="file" accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} className="hidden" />
          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${isDragging ? 'bg-accent/20' : 'bg-muted'}`}>
            <CloudArrowUpIcon className={`w-10 h-10 transition-colors ${isDragging ? 'text-accent' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground mb-1">
              {isDragging ? 'Drop to upload' : 'Select or drag & drop a video'}
            </p>
            <p className="text-sm text-muted-foreground">MP4, MOV, WebM · Up to 2 GB</p>
          </div>
          <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="px-6 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            Choose File
          </button>
        </div>
    );
  }

  // -------- STAGE 2: Video selected --------

  return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 min-w-0 w-full">

        {/* -------- Hero: video preview + core details side-by-side -------- */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Left: player */}
          <div className="space-y-3 min-w-0">
            <div className="rounded-xl overflow-hidden bg-black">
              <VideoPlayer
                  video={{ id: 'preview', title: title || videoPreview.file.name, creator: '', description, thumbnail: '', src: videoPreview.url, duration: videoPreview.duration }}
                  onWatchedTimeUpdate={() => {}}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 min-w-0">
              <span className="font-medium text-foreground truncate min-w-0 flex-1">{videoPreview.file.name}</span>
              <span className="shrink-0">·</span>
              <span className="shrink-0">{formatDuration(videoPreview.duration)}</span>
              <span className="shrink-0">·</span>
              <span className="shrink-0">{videoPreview.size}</span>
              <button type="button" onClick={clearVideo} className="ml-2 text-destructive hover:text-destructive/80 transition-colors font-medium shrink-0">
                Remove
              </button>
            </div>

            {/* Upload progress */}
            {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{uploadStage}</span>
                    <span>{Math.min(Math.round(uploadProgress), 100)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-accent h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
            )}

            {uploadCompleted && (
                <div className="flex items-center gap-2 justify-center text-success py-1">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Upload complete!</span>
                </div>
            )}
          </div>

          {/* Right: title + description */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Video Title</label>
              <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a descriptive title"
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-all text-foreground placeholder:text-muted-foreground"
                  maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">{title.length}/100</p>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Description</label>
              <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers about your video"
                  rows={6}
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-all resize-none text-foreground placeholder:text-muted-foreground"
                  maxLength={5000}
              />
              <p className="text-xs text-muted-foreground mt-1">{description.length}/5000</p>
            </div>
          </div>
        </div>

        {/* -------- Thumbnail card -------- */}
        <SectionCard title="Thumbnail" icon={<PhotoIcon />}>
          <div>
            <p className="text-xs text-muted-foreground mb-3">A great thumbnail stands out and draws viewers' attention. Recommended: 1280×720 (16:9)</p>
            {thumbnailPreview ? (
                <div className="relative w-full max-w-xs rounded-xl overflow-hidden border border-border group">
                  <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full aspect-video object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button type="button" onClick={() => thumbnailInputRef.current?.click()} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium backdrop-blur-sm transition-colors">Change</button>
                    <button type="button" onClick={clearThumbnail} className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg backdrop-blur-sm transition-colors"><XMarkIcon className="w-4 h-4" /></button>
                  </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="w-full max-w-xs aspect-video flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl hover:border-accent/50 hover:bg-accent/5 transition-all text-muted-foreground hover:text-accent"
                >
                  <PhotoIcon className="w-8 h-8" />
                  <span className="text-sm font-medium">Upload Thumbnail</span>
                  <span className="text-xs">JPEG, PNG, WebP · Max 5 MB</span>
                </button>
            )}
            <input ref={thumbnailInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbnailSelect(f); }} className="hidden" />
          </div>
        </SectionCard>

        {/* -------- Discoverability card -------- */}
        <SectionCard title="Discoverability" icon={<TagIcon />}>
          <SectorSelector
              selectedSectors={selectedSectors}
              onChange={setSelectedSectors}
              isTest={isTest}
              onIsTestChange={setIsTest}
              isAI={isAI}
              videoDuration={videoPreview?.duration}
          />

          {someNeedApproval && !uploadCompleted && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-400">
                <InformationCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
                <span>One or more selected sectors require approval. Your video will be reviewed before appearing there. Contributors and higher bypass this automatically.</span>
              </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Tags</label>
            <div className="w-full px-4 py-2.5 bg-input border border-border rounded-xl focus-within:border-ring focus-within:ring-1 focus-within:ring-ring transition-all">
              <div className="flex flex-wrap gap-2 items-center">
                {tags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/20 text-accent text-sm rounded-lg border border-accent/30">
                  {tag}
                      <button type="button" onClick={() => removeTag(i)} className="hover:bg-accent/30 rounded-full p-0.5 transition-colors"><XMarkIcon className="w-3.5 h-3.5" /></button>
                </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? 'Gaming, Music, Science...' : 'Add a tag...'}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-muted rounded text-muted-foreground">,</kbd> to add tags
            </p>
          </div>
        </SectionCard>

        {/* -------- Visibility card -------- */}
        <SectionCard title="Visibility" icon={<EyeIcon />}>
          <div className="grid grid-cols-3 gap-3">
            {VISIBILITY_OPTIONS.map((opt) => (
                <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={`flex flex-col items-start gap-1 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        visibility === opt.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-muted'
                    }`}
                >
                  <opt.Icon className={`w-5 h-5 mb-0.5 ${visibility === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-semibold ${visibility === opt.value ? 'text-primary' : 'text-foreground'}`}>{opt.label}</span>
                  <span className="text-xs text-muted-foreground leading-tight">{opt.description}</span>
                </button>
            ))}
          </div>
        </SectionCard>

        {/* -------- AI disclosure card -------- */}
        <SectionCard title="AI Disclosure" icon={<SparklesIcon />}>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
                type="checkbox"
                checked={isAI}
                onChange={(e) => setIsAI(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-primary shrink-0"
            />
            <div>
              <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">This video contains AI-generated content</span>
              <p className="text-xs text-muted-foreground mt-0.5">Disclose if any part of this video was created or significantly modified by AI tools.</p>
            </div>
          </label>
        </SectionCard>

        {/* -------- Action bar -------- */}
        {uploadCompleted ? (
            <div className="flex flex-col gap-3 pt-2">
              {pendingSlugs.length > 0 && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-400">
                    <p className="font-medium mb-1">Awaiting approval</p>
                    <p>Your video is pending review in{' '}
                      {pendingSlugs.map((s, i) => (<span key={s}>{i > 0 && ', '}<span className="font-mono">s/{s}</span></span>))}.
                      It won't appear there until a moderator approves it.
                    </p>
                  </div>
              )}
              <Link
                  href={`/watch/${uploadedSlug || videoId}`}
                  className="block w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors text-center"
              >
                View Video
              </Link>
            </div>
        ) : (
            <div className="flex gap-3 pt-2">
              <button
                  onClick={clearVideo}
                  disabled={uploading}
                  className="px-6 py-3 border border-border rounded-xl font-semibold hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-foreground"
                  type="button"
              >
                Remove Video
              </button>
              <button
                  onClick={handlePublish}
                  disabled={uploading || !title.trim() || !channelId || !videoPreview || hasViolations}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition-colors"
              >
                {uploading ? `Uploading… ${Math.round(uploadProgress)}%` : 'Publish Video'}
              </button>
            </div>
        )}
      </div>
  );
}
