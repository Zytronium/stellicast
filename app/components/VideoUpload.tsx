'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { XMarkIcon } from '@heroicons/react/20/solid';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import VideoPlayer from '@/components/VideoPlayer';

type VideoPreview = {
  file: File;
  url: string;
  duration: number;
  size: string;
};

export default function VideoUpload({ channelId }: { channelId?: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [videoPreview, setVideoPreview] = useState<VideoPreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadCompleted, setUploadCompleted] = useState(false);

  const [videoId, setVideoId] = useState<string | null>(null);
  const uploadTargetRef = useRef<any>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [isAI, setIsAI] = useState(false);

  const [tags, setTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const addTag = (tagText: string) => {
    const trimmed = tagText.trim();
    if (!trimmed) return;
    const lowerTags = tags.map(t => t.toLowerCase());
    if (lowerTags.includes(trimmed.toLowerCase())) {
      setInputValue('');
      return;
    }
    setTags(prev => [...prev, trimmed]);
    setInputValue('');
  };

  const removeTag = (index: number) => setTags(prev => prev.filter((_, i) => i !== index));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
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
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file');
      return;
    }

    const maxSize = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 2GB');
      return;
    }

    const url = URL.createObjectURL(file);

    if (!title) {
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(fileName);
    }

    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      const dur = isFinite(videoEl.duration) ? Math.floor(videoEl.duration) : 0;
      setVideoPreview({
        file,
        url,
        duration: dur,
        size: formatFileSize(file.size),
      });
    };
    videoEl.src = url;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview.url);
    setVideoPreview(null);
    setUploadProgress(0);
    setUploadStage('');
    setUploading(false);
    setUploadCompleted(false);
    uploadTargetRef.current = null;
    setVideoId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startUploadFlow = async (file: File, durationSeconds: number) => {
    if (!channelId) {
      alert('Please select a channel before uploading.');
      return false;
    }

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
        }),
      });

      if (!createRes.ok) {
        const errorBody = await createRes.text().catch(() => '');
        throw new Error(errorBody || 'Failed to initialize upload');
      }

      const createJson = await createRes.json();
      const id = createJson.videoId || createJson.id || createJson.video_id;
      setVideoId(id || null);

      const uploadUrl = createJson.uploadUrl || createJson.upload_url;
      const guid = createJson.guid;
      const libraryId = createJson.libraryId || createJson.library_id;
      const apiKey = createJson.apiKey || createJson.api_key;

      uploadTargetRef.current = { uploadUrl, guid, libraryId, apiKey };
      setUploadProgress(15);
      setUploadStage('Uploading file...');

      await uploadFileWithProgress(file, uploadTargetRef.current);

      setUploadProgress(100);
      setUploadStage('Upload complete');
      setUploading(false);
      setUploadCompleted(true);

      if (id) {
        await fetch(`/api/videos/${id}/metadata`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            visibility,
            is_ai: isAI,
            is_promotional: false,
            tags,
            duration: durationSeconds,
          }),
        }).catch(err => console.error('Failed to patch metadata after upload', err));
      }

      return true;
    } catch (err: any) {
      console.error('Upload flow error', err);
      alert(err?.message || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
      setUploadStage('');
      uploadTargetRef.current = null;
      setVideoId(null);
      return false;
    }
  };

  const uploadFileWithProgress = (file: File, target: any) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 80) + 15;
          setUploadProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));

      if (target?.uploadUrl) {
        try {
          xhr.open('PUT', target.uploadUrl, true);
        } catch (e) {
          reject(e);
          return;
        }
      } else if (target?.libraryId && target?.apiKey && target?.guid) {
        const putUrl = `https://video.bunnycdn.com/library/${target.libraryId}/videos/${target.guid}`;
        xhr.open('PUT', putUrl, true);
        xhr.setRequestHeader('AccessKey', target.apiKey);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      } else {
        reject(new Error('No upload target available'));
        return;
      }

      xhr.send(file);
    });
  };

  const handlePublish = async () => {
    if (!channelId) {
      alert('Please select a channel before publishing.');
      return;
    }

    if (!title.trim()) {
      alert('Please provide a title.');
      return;
    }

    if (!videoPreview) {
      alert('Please select a video file to upload.');
      return;
    }

    // Start upload when publish is clicked
    const uploadSuccess = await startUploadFlow(videoPreview.file, videoPreview.duration);

    if (!uploadSuccess) {
      return;
    }

    // Navigate to watch page after successful upload
    if (videoId) {
      router.push(`/watch/${videoId}`);
    }
  };

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview.url);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Metadata form - always visible */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Video Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a descriptive title"
            className="w-full px-4 py-2.5 bg-black border border-gray-800 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell viewers about your video"
            rows={4}
            className="w-full px-4 py-2.5 bg-black border border-gray-800 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all resize-none"
            maxLength={5000}
          />
          <p className="text-xs text-gray-500 mt-1">{description.length}/5000 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Tags</label>
          <div className="w-full px-4 py-2.5 bg-black border border-gray-800 rounded-xl focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition-all">
            <div className="flex flex-wrap gap-2 items-center">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded-lg border border-blue-600/30"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                    className="hover:bg-blue-600/30 rounded-full p-0.5 transition-colors"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={tags.length === 0 ? "Gaming, Music, Science..." : "Add a tag..."}
                className="flex-1 min-w-[120px] bg-transparent outline-none text-white placeholder-gray-500"
              />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">,</kbd> to add tags
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setVisibility('public')}
            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
              visibility === 'public'
                ? 'border-blue-600 bg-blue-600/10 text-blue-400'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            Public
          </button>
          <button
            type="button"
            onClick={() => setVisibility('unlisted')}
            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
              visibility === 'unlisted'
                ? 'border-blue-600 bg-blue-600/10 text-blue-400'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            Unlisted
          </button>
          <button
            type="button"
            onClick={() => setVisibility('private')}
            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
              visibility === 'private'
                ? 'border-blue-600 bg-blue-600/10 text-blue-400'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            Private
          </button>
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAI}
              onChange={(e) => setIsAI(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm text-gray-300">This video contains AI-generated content</span>
          </label>
        </div>
      </div>

      {/* File upload area */}
      {!videoPreview && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <CloudArrowUpIcon className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <div className="text-lg font-semibold">Select or drag & drop a video file</div>
          <div className="text-sm text-gray-400 mt-1">MP4, MOV, WebM • Max 2GB</div>
        </div>
      )}

      {/* Video preview */}
      {videoPreview && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden">
            <VideoPlayer
              video={{
                id: 'preview',
                title: title || videoPreview.file.name,
                creator: '',
                description: description,
                thumbnail: '',
                src: videoPreview.url,
                duration: videoPreview.duration,
              }}
              onWatchedTimeUpdate={() => {}}
            />
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="font-medium text-white">{title || videoPreview.file.name}</div>
            <div>•</div>
            <div>{formatDuration(videoPreview.duration)}</div>
            <div>•</div>
            <div>{videoPreview.size}</div>
          </div>

          {/* Upload progress during publish */}
          {uploading && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{uploadStage}</span>
                <span>{Math.min(Math.round(uploadProgress), 100)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden mt-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-blue-400 h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {uploadCompleted && (
            <div className="flex items-center gap-2 justify-center text-green-400">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Upload complete!</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={clearVideo}
          disabled={uploading}
          className="flex-1 px-6 py-3 border border-gray-700 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          {videoPreview ? 'Remove Video' : 'Cancel'}
        </button>
        <button
          onClick={handlePublish}
          disabled={uploading || uploadCompleted || !title.trim() || !channelId || !videoPreview}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
        >
          {uploading ? `Uploading... ${Math.round(uploadProgress)}%` : uploadCompleted ? 'Published' : 'Publish Video'}
        </button>
      </div>
    </div>
  );
}
