'use client';

import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, Gauge, RotateCcw } from 'lucide-react';

export type Video = {
  id: string;
  title: string;
  creator: string;
  description: string;
  thumbnail: string;
  src: string;
  duration?: number;
};

type VideoPlayerProps = {
  video: Video;
  onWatchedTimeUpdate?: (watchedSeconds: number) => void;
};

const SHOW_DEBUG_INFO = false;

export default function VideoPlayer({ video, onWatchedTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const watchedSegmentsRef = useRef<Set<number>>(new Set());
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
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [availableQualities, setAvailableQualities] = useState<{ id: number, height: string }[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number
  } | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [totalWatchedSeconds, setTotalWatchedSeconds] = useState(0);

  const qualities = ['2160p', '1440p', '1080p', '720p', '480p', '360p', 'Auto'];
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const hlsRef = useRef<Hls | null>(null);

  // Track unique watched seconds (prevents skipping ahead to cheat)
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      const currentSecond = Math.floor(videoElement.currentTime);

      // Only count this second if we haven't watched it before
      if (!watchedSegmentsRef.current.has(currentSecond)) {
        watchedSegmentsRef.current.add(currentSecond);
        const newTotal = watchedSegmentsRef.current.size;
        setTotalWatchedSeconds(newTotal);

        // Notify parent component
        if (onWatchedTimeUpdate) {
          onWatchedTimeUpdate(newTotal);
        }
      }
    };

    videoElement.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [onWatchedTimeUpdate]);

  // Track when metadata is loaded and duration is available
  useEffect(() => {
    if (duration > 0 && video.id) {
      // Check if we need to update the database (only if it's currently 0 or missing)
      // Note: 'video' here is the prop from the parent WatchPage
      const needsUpdate = !video.duration || video.duration === 0;

      if (needsUpdate) {
        console.log(`Reporting duration for video ${video.id}: ${duration}s`);
        fetch(`/api/videos/${video.id}/metadata`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration: Math.round(duration) }),
        }).catch(err => console.error("Failed to update duration:", err));
      }
    }
  }, [duration, video.id, video.duration]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (video.src.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(video.src);
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels.map((level, index) => ({
            id: index,
            height: `${level.height}p`
          })).reverse(); // Higher resolutions first
          setAvailableQualities(levels);
        });
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari
        videoElement.src = video.src;
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [video.src]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const updateTime = () => setCurrentTime(videoElement.currentTime);
    const updateDuration = () => {
      if (videoElement.duration && isFinite(videoElement.duration)) {
        setDuration(videoElement.duration);
      }
    };
    const updateBuffered = () => {
      const ranges = [];
      for (let i = 0; i < videoElement.buffered.length; i++) {
        ranges.push({
          start: videoElement.buffered.start(i),
          end: videoElement.buffered.end(i)
        });
      }
      setBuffered(ranges);
    };
    const handleEnded = () => setHasEnded(true);

    videoElement.addEventListener('timeupdate', updateTime);
    videoElement.addEventListener('loadedmetadata', updateDuration);
    videoElement.addEventListener('durationchange', updateDuration);
    videoElement.addEventListener('progress', updateBuffered);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('timeupdate', updateTime);
      videoElement.removeEventListener('loadedmetadata', updateDuration);
      videoElement.removeEventListener('durationchange', updateDuration);
      videoElement.removeEventListener('progress', updateBuffered);
      videoElement.removeEventListener('ended', handleEnded);
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

  const handleProgressClick = (e: React.MouseEvent | MouseEvent) => {
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
        handleProgressClick(e);
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

  const changeQuality = (id: number, label: string) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = id;
      setSelectedQuality(label);
      setShowQualityMenu(false);
    }
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
      <video
        ref={videoRef}
        className="w-full aspect-video"
        poster={video.thumbnail}
        onClick={handleVideoClick}
        onContextMenu={handleContextMenu}
      >
        <source src={video.src} type="video/mp4" />
      </video>

      {/* Debug info - shows actual watched time vs current position */}
      {process.env.NODE_ENV === 'development' && SHOW_DEBUG_INFO === true && (
        <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-3 py-2 rounded-lg space-y-1">
          <div>Watched: {totalWatchedSeconds}s</div>
          <div>Position: {Math.floor(currentTime)}s</div>
          <div>Progress: {duration > 0 ? Math.round((totalWatchedSeconds / duration) * 100) : 0}%</div>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed bg-black/95 rounded-lg shadow-lg py-2 z-50 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={togglePlay} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800">
            {isPlaying ? 'Pause' : hasEnded ? 'Replay' : 'Play'}
          </button>
          <button onClick={toggleMute} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800">
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <div className="border-t border-gray-700 my-1"></div>
          <button onClick={copyVideoUrl} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800">
            Copy video URL
          </button>
          <button onClick={copyCurrentTime} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800">
            Copy video URL at current time
          </button>
          <div className="border-t border-gray-700 my-1"></div>
          <button onClick={toggleLoop} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex items-center justify-between">
            <span>Loop</span>
            {isLooping && <span className="text-blue-400">✓</span>}
          </button>
          <div className="border-t border-gray-700 my-1"></div>
          <div className="px-4 py-2 text-xs text-gray-500">
            Stellicast Video Player v1.0
          </div>
        </div>
      )}

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

      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${showControls || !isFullscreen ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-blue-400 transition">
              {hasEnded ? <RotateCcw className="w-6 h-6" /> : isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <div className="relative flex items-center gap-2">
              <button onClick={toggleMute} className="text-white hover:text-blue-400 transition">
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              {showVolumeSlider && (
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="w-20" />
              )}
              <button onClick={() => setShowVolumeSlider(!showVolumeSlider)} className="text-xs text-gray-400 hover:text-white">
                {Math.round(volume * 100)}%
              </button>
            </div>
            <div className="relative">
              <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="text-white hover:text-blue-400 transition flex items-center gap-1">
                <Gauge className="w-5 h-5" />
                <span className="text-xs">{playbackRate}x</span>
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-black/95 rounded-lg p-2 min-w-[100px]">
                  {speeds.map(speed => (
                    <button key={speed} onClick={() => changeSpeed(speed)} className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-800 rounded ${speed === playbackRate ? 'text-blue-400' : 'text-white'}`}>
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-300">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowQualityMenu(!showQualityMenu)} className="text-white hover:text-blue-400 transition text-sm font-medium">
                {selectedQuality}
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-black/95 rounded-lg p-2 min-w-[100px] max-h-60 overflow-y-auto">
                  <button
                    onClick={() => changeQuality(-1, 'Auto')}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-800 rounded ${selectedQuality === 'Auto' ? 'text-blue-400' : 'text-white'}`}
                  >
                    Auto
                  </button>
                  {availableQualities.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => changeQuality(q.id, q.height)}
                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-800 rounded ${q.height === selectedQuality ? 'text-blue-400' : 'text-white'}`}
                    >
                      {q.height}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="text-white hover:text-blue-400 transition">
                <Settings className="w-6 h-6" />
              </button>
              {showSettingsMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-black/95 rounded-lg p-3 min-w-[200px]">
                  <div className="text-white text-sm space-y-2">
                    <div className="font-semibold border-b border-gray-700 pb-2">Settings</div>
                    <button className="block w-full text-left px-2 py-1 hover:bg-gray-800 rounded">Subtitles</button>
                    <button className="block w-full text-left px-2 py-1 hover:bg-gray-800 rounded">Annotations</button>
                    <button onClick={toggleLoop} className="flex items-center justify-between w-full text-left px-2 py-1 hover:bg-gray-800 rounded">
                      <span>Loop</span>
                      {isLooping && <span className="text-blue-400">✓</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition">
              <Maximize className="w-6 h-6" />
            </button>
          </div>
        </div>

        {isFullscreen && (
          <div ref={progressRef} className="relative h-1 bg-gray-900 cursor-pointer group/progress" onMouseMove={handleProgressMouseMove} onMouseLeave={() => setHoverTime(null)} onMouseDown={handleProgressMouseDown}>
            {buffered.map((range, i) => (
              <div key={i} className="absolute h-full bg-gray-700" style={{ left: `${(range.start / duration) * 100}%`, width: `${((range.end - range.start) / duration) * 100}%` }} />
            ))}
            <div className="absolute h-full bg-blue-600 transition-all" style={{ width: `${getWatchedPercent()}%` }} />
            {hoverTime !== null && (
              <>
                <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${(hoverTime / duration) * 100}%` }} />
                <div className="absolute -top-8 transform -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap" style={{ left: `${(hoverTime / duration) * 100}%` }}>
                  {formatTime(hoverTime)}
                </div>
              </>
            )}
            <div className="absolute inset-0 h-1 group-hover/progress:h-1.5 transition-all" />
          </div>
        )}
      </div>

      {!isFullscreen && (
        <div ref={progressRef} className="relative h-1 bg-gray-900 cursor-pointer group/progress" onMouseMove={handleProgressMouseMove} onMouseLeave={() => setHoverTime(null)} onMouseDown={handleProgressMouseDown}>
          {buffered.map((range, i) => (
            <div key={i} className="absolute h-full bg-gray-700" style={{ left: `${(range.start / duration) * 100}%`, width: `${((range.end - range.start) / duration) * 100}%` }} />
          ))}
          <div className="absolute h-full bg-blue-600 transition-all" style={{ width: `${getWatchedPercent()}%` }} />
          {hoverTime !== null && (
            <>
              <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${(hoverTime / duration) * 100}%` }} />
              <div className="absolute -top-8 transform -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap" style={{ left: `${(hoverTime / duration) * 100}%` }}>
                {formatTime(hoverTime)}
              </div>
            </>
          )}
          <div className="absolute inset-0 h-1 group-hover/progress:h-1.5 transition-all" />
        </div>
      )}
    </div>
  );
}