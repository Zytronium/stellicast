'use client';

import { useState } from 'react';
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";

export default function VideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('video') as File;
    const title = formData.get('title') as string;

    if (!file) return;
    setUploading(true);

    try {
      // 1. Get the upload GUID and credentials from our API
      const initRes = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
              title,
              description: formData.get('description'),
              is_ai: formData.get('is_ai') === 'on'
            }),
          });
          
          if (!initRes.ok) throw new Error('Failed to initialize upload');
          const { guid, libraryId, apiKey } = await initRes.json();

          // 2. Upload directly to Bunny.net from the client
          const xhr = new XMLHttpRequest();
          // Use the global upload endpoint for better reliability
          xhr.open('PUT', `https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`, true);
          xhr.setRequestHeader('AccessKey', apiKey);
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');

          xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          alert('Upload complete! Video is now processing.');
          form.reset();
          setProgress(0);
        } else {
          alert('Upload failed: ' + xhr.statusText);
        }
        setUploading(false);
      };

      xhr.onerror = () => {
        alert('Upload error occurred.');
        setUploading(false);
      };

      xhr.send(file);

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to start upload');
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Video Title</label>
          <input
            type="text"
            name="title"
            placeholder="Enter a descriptive title"
            className="w-full px-4 py-2.5 bg-black border border-gray-800 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
          <textarea
            name="description"
            placeholder="Tell viewers about your video"
            rows={4}
            className="w-full px-4 py-2.5 bg-black border border-gray-800 rounded-xl focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all resize-none"
          />
        </div>

        <div className="flex items-center gap-3 p-4 bg-gray-900/30 border border-gray-800 rounded-xl">
          <input
            type="checkbox"
            name="is_ai"
            id="is_ai"
            className="w-4 h-4 rounded border-gray-700 bg-black text-blue-600 focus:ring-blue-600"
          />
          <label htmlFor="is_ai" className="text-sm text-gray-300">
            This video contains AI-generated content (Disclosure required)
          </label>
        </div>

        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative border-2 border-dashed border-gray-800 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors">
            <input
              type="file"
              name="video"
              accept="video/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              required
            />
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center">
                <CloudArrowUpIcon className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-sm">
                <span className="text-blue-500 font-semibold">Click to upload</span> or drag and drop
              </div>
              <p className="text-xs text-gray-500">MP4, MOV or WebM (MAX. 2GB)</p>
            </div>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Uploading to Stellicast...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      <button
        type="submit"
        disabled={uploading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </span>
        ) : 'Publish Video'}
      </button>
    </form>
  );
}
