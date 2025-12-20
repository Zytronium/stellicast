'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Gauge, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Video = {
  id: string;
  title: string;
  creator: string;
  description: string;
  thumbnail: string;
  src: string;
};

function VideoPlayer({ video }: { video: Video }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [buffered, setBuffered] = useState<{start: number, end: number}[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isLooping, setIsLooping] = useState(false);

  const qualities = ['2160p', '1440p', '1080p', '720p', '480p', '360p', 'Auto'];
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const updateBuffered = () => {
      const ranges = [];
      for (let i = 0; i < video.buffered.length; i++) {
        ranges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i)
        });
      }
      setBuffered(ranges);
    };
    const handleEnded = () => setHasEnded(true);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('progress', updateBuffered);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('progress', updateBuffered);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleClickOutside = () => {
      setContextMenu(null);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skip(5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skip(-5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (hasEnded) {
      video.currentTime = 0;
      setHasEnded(false);
      video.play();
      setIsPlaying(true);
    } else if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    const video = videoRef.current;
    const progress = progressRef.current;
    if (!video || !progress) return;

    const rect = progress.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
  };

  const handleProgressMouseMove = (e: React.MouseEvent) => {
    const progress = progressRef.current;
    if (!progress) return;

    const rect = progress.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    setHoverTime(percent * duration);
  };

  const handleProgressMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleProgressClick(e as any);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (time: number) => {
    if (!time || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getWatchedPercent = () => (currentTime / duration) * 100 || 0;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const copyVideoUrl = () => {
    navigator.clipboard.writeText(video.src);
    setContextMenu(null);
  };

  const copyCurrentTime = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('t', Math.floor(currentTime).toString());
    navigator.clipboard.writeText(url.toString());
    setContextMenu(null);
  };

  const toggleLoop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = !video.loop;
    setIsLooping(!isLooping);
    setContextMenu(null);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    // Don't toggle play if we're closing the context menu
    if (contextMenu) {
      e.stopPropagation();
      return;
    }
    togglePlay();
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full aspect-video"
        poster={video.thumbnail}
        onClick={handleVideoClick}
        onContextMenu={handleContextMenu}
      >
        <source src={video.src} type="video/mp4" />
      </video>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-black/95 rounded-lg shadow-lg py-2 z-50 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={togglePlay}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            {isPlaying ? 'Pause' : hasEnded ? 'Replay' : 'Play'}
          </button>
          <button
            onClick={toggleMute}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <div className="border-t border-gray-700 my-1"></div>
          <button
            onClick={copyVideoUrl}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Copy video URL
          </button>
          <button
            onClick={copyCurrentTime}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Copy video URL at current time
          </button>
          <div className="border-t border-gray-700 my-1"></div>
          <button
            onClick={toggleLoop}
            className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex items-center justify-between"
          >
            <span>Loop</span>
            {isLooping && <span className="text-blue-400">✓</span>}
          </button>
          <div className="border-t border-gray-700 my-1"></div>
          <div className="px-4 py-2 text-xs text-gray-500">
            Stellicast Video Player v1.0
          </div>
        </div>
      )}

      {/* Play/Replay Button Overlay */}
      {(!isPlaying || hasEnded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <button
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition-all transform hover:scale-110 pointer-events-auto"
          >
            {hasEnded ? (
              <RotateCcw className="w-10 h-10 text-white" />
            ) : (
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            )}
          </button>
        </div>
      )}

      {/* Control Buttons - Above progress bar */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${showControls || !isFullscreen ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Play/Pause/Replay */}
            <button onClick={togglePlay} className="text-white hover:text-blue-400 transition">
              {hasEnded ? (
                <RotateCcw className="w-6 h-6" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            {/* Volume */}
            <div className="relative flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-blue-400 transition">
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              {showVolumeSlider && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20"
                />
              )}
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className="text-xs text-gray-400 hover:text-white"
              >
                {Math.round(volume * 100)}%
              </button>
            </div>

            {/* Speed */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-white hover:text-blue-400 transition flex items-center gap-1"
              >
                <Gauge className="w-5 h-5" />
                <span className="text-xs">{playbackRate}x</span>
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-black/95 rounded-lg p-2 min-w-[100px]">
                  {speeds.map(speed => (
                    <button
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-800 rounded ${speed === playbackRate ? 'text-blue-400' : 'text-white'}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Time */}
            <span className="text-sm text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quality */}
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="text-white hover:text-blue-400 transition text-sm font-medium"
              >
                {selectedQuality}
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-black/95 rounded-lg p-2 min-w-[100px]">
                  {qualities.map(quality => (
                    <button
                      key={quality}
                      onClick={() => {
                        setSelectedQuality(quality);
                        setShowQualityMenu(false);
                      }}
                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-800 rounded ${quality === selectedQuality ? 'text-blue-400' : 'text-white'}`}
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="text-white hover:text-blue-400 transition"
              >
                <Settings className="w-6 h-6" />
              </button>
              {showSettingsMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-black/95 rounded-lg p-3 min-w-[200px]">
                  <div className="text-white text-sm space-y-2">
                    <div className="font-semibold border-b border-gray-700 pb-2">Settings</div>
                    <button className="block w-full text-left px-2 py-1 hover:bg-gray-800 rounded">Subtitles</button>
                    <button className="block w-full text-left px-2 py-1 hover:bg-gray-800 rounded">Annotations</button>
                    <button className="block w-full text-left px-2 py-1 hover:bg-gray-800 rounded">Loop</button>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition">
              <Maximize className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress Bar - Inside video overlay in fullscreen, below controls */}
        {isFullscreen && (
          <div
            ref={progressRef}
            className="relative h-1 bg-gray-900 cursor-pointer group/progress"
            onMouseMove={handleProgressMouseMove}
            onMouseLeave={() => setHoverTime(null)}
            onMouseDown={handleProgressMouseDown}
          >
            {/* Buffered ranges */}
            {buffered.map((range, i) => (
              <div
                key={i}
                className="absolute h-full bg-gray-700"
                style={{
                  left: `${(range.start / duration) * 100}%`,
                  width: `${((range.end - range.start) / duration) * 100}%`
                }}
              />
            ))}

            {/* Watched progress */}
            <div
              className="absolute h-full bg-blue-600 transition-all"
              style={{ width: `${getWatchedPercent()}%` }}
            />

            {/* Hover preview indicator */}
            {hoverTime !== null && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white"
                  style={{ left: `${(hoverTime / duration) * 100}%` }}
                />
                <div
                  className="absolute -top-8 transform -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                  style={{ left: `${(hoverTime / duration) * 100}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              </>
            )}

            {/* Hover effect */}
            <div className="absolute inset-0 h-1 group-hover/progress:h-1.5 transition-all" />
          </div>
        )}
      </div>

      {/* Progress Bar - Below video in normal mode */}
      {!isFullscreen && (
        <div
          ref={progressRef}
          className="relative h-1 bg-gray-900 cursor-pointer group/progress"
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          onMouseDown={handleProgressMouseDown}
        >
          {/* Buffered ranges */}
          {buffered.map((range, i) => (
            <div
              key={i}
              className="absolute h-full bg-gray-700"
              style={{
                left: `${(range.start / duration) * 100}%`,
                width: `${((range.end - range.start) / duration) * 100}%`
              }}
            />
          ))}

          {/* Watched progress */}
          <div
            className="absolute h-full bg-blue-600 transition-all"
            style={{ width: `${getWatchedPercent()}%` }}
          />

          {/* Hover preview indicator */}
          {hoverTime !== null && (
            <>
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white"
                style={{ left: `${(hoverTime / duration) * 100}%` }}
              />
              <div
                className="absolute -top-8 transform -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                style={{ left: `${(hoverTime / duration) * 100}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            </>
          )}

          {/* Hover effect */}
          <div className="absolute inset-0 h-1 group-hover/progress:h-1.5 transition-all" />
        </div>
      )}
    </div>
  );
}

export default function WatchPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const [video, setVideo] = useState<Video | null>(null);
  const [upNext, setUpNext] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await Promise.resolve(params);
      const { id } = resolvedParams;

      try {
        // Fetch current video
        const videoRes = await fetch(`/api/videos/${id}`);
        if (!videoRes.ok) {
          notFound();
          return;
        }
        const videoData = await videoRes.json();
        setVideo(videoData);

        // Fetch all videos for up next
        const allRes = await fetch(`/api/videos`);
        if (allRes.ok) {
          const allData = await allRes.json();
          const videos = Array.isArray(allData.videos) ? allData.videos : [];
          setUpNext(videos.filter((v: Video) => v.id !== id).slice(0, 8));
        }
      } catch (error) {
        console.error('Error loading video:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!video) {
    notFound();
    return null;
  }

  return (
    <div className="flex gap-6 max-w-[1800px] mx-auto">
      {/* Left side: Video Player and Info */}
      <div className="flex-1 min-w-0">
        {/* Video Player */}
        <VideoPlayer video={video} />

        {/* Video Info Section */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <a
                href={video.src}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
              >
                Open source URL
              </a>
              <Link
                href={`/watch/${video.id}`}
                className="rounded-lg border border-gray-800 bg-[#0a0a0a] px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-900"
              >
                Permalink
              </Link>
            </div>
          </div>

          <h1 className="text-2xl font-semibold">{video.title}</h1>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {video.creator?.[0]?.toUpperCase() ?? 'C'}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-100">{video.creator}</div>
                <div className="text-xs text-gray-400">2.1k views • 2 days ago</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Follow
              </button>
              <button
                type="button"
                className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-2 text-sm text-gray-100 hover:bg-gray-800"
              >
                Like
              </button>
              <button
                type="button"
                className="rounded-xl border border-gray-800 bg-[#0a0a0a] px-4 py-2 text-sm text-gray-100 hover:bg-gray-900"
              >
                Share
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#0a0a0a] p-4">
            <details open className="group">
              <summary className="cursor-pointer list-none text-sm font-semibold text-gray-100">
                Description
                <span className="ml-2 text-xs font-normal text-gray-400 group-open:hidden">
                  (click to expand)
                </span>
              </summary>
              <div className="mt-3 text-sm leading-relaxed text-gray-300">
                {video.description.split('\n').map((line, i) => (
                  <p key={i} className={i === 0 ? '' : 'mt-3'}>
                    {line}
                  </p>
                ))}
              </div>
            </details>
          </div>
        </div>

        {/* Continued Feed Below */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4">More Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upNext.map((v) => (
              <Link key={v.id} href={`/watch/${v.id}`} className="bg-gray-900/50 rounded-lg overflow-hidden hover:bg-gray-900 transition">
                <div className="aspect-video bg-gray-800 relative">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium line-clamp-2">{v.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{v.creator} • 2.1k views</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Comments */}
      <div className="w-96 bg-gray-900/50 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Comments</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0"></div>
            <div className="flex-1">
              <p className="text-sm font-medium">User Name</p>
              <p className="text-sm text-gray-300 mt-1">This is a placeholder comment. Comments functionality to be implemented.</p>
              <div className="flex gap-3 mt-2 text-xs text-gray-400">
                <button className="hover:text-white">Like</button>
                <button className="hover:text-white">Reply</button>
                <span>2 days ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}