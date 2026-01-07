'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Gauge,
  RotateCcw,
} from 'lucide-react';

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

export default function VideoPlayer({ video, onWatchedTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const watchedSegmentsRef = useRef<Set<number>>(new Set());
  const hlsRef = useRef<Hls | null>(null);

  const lastTapRef = useRef<number>(0);
  const lastTapXRef = useRef<number | null>(null);
  const typedBufferRef = useRef<string>('');
  const inactivityTimerRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [buffered, setBuffered] = useState<{ start: number; end: number }[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [availableQualities, setAvailableQualities] = useState<{ id: number; height: string }[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [totalWatchedSeconds, setTotalWatchedSeconds] = useState(0);

  const [announcement, setAnnouncement] = useState('');
  const announcementTimerRef = useRef<number | null>(null);

  const [partyMode, setPartyMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const qualities = ['2160p', '1440p', '1080p', '720p', '480p', '360p', 'Auto'];
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  // announce for screen readers
  const announce = useCallback((text: string) => {
    setAnnouncement(text);
    if (announcementTimerRef.current) window.clearTimeout(announcementTimerRef.current);
    announcementTimerRef.current = window.setTimeout(() => setAnnouncement(''), 2500);
  }, []);

  // Activity tracking - show controls and reset inactivity timer
  const handleActivity = useCallback(() => {
    setShowControls(true);
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Handle mouse leave (desktop only)
  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setShowControls(false);
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
    }
  }, [isMobile]);

  // mobile detection
  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const mobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
      ('ontouchstart' in window);
    setIsMobile(mobile);
  }, []);

  // HLS setup
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (video.src.includes('.m3u8')) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(video.src);
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels
            .map((level, index) => ({ id: index, height: `${level.height}p` }))
            .reverse();
          setAvailableQualities(levels);
        });
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = video.src;
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [video.src]);

  // watched-seconds tracker
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleTimeUpdate = () => {
      const currentSecond = Math.floor(videoEl.currentTime);
      if (!watchedSegmentsRef.current.has(currentSecond)) {
        watchedSegmentsRef.current.add(currentSecond);
        const newTotal = watchedSegmentsRef.current.size;
        setTotalWatchedSeconds(newTotal);
        if (onWatchedTimeUpdate) onWatchedTimeUpdate(newTotal);
      }
    };

    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    return () => videoEl.removeEventListener('timeupdate', handleTimeUpdate);
  }, [onWatchedTimeUpdate]);

  // time/duration/buffer/ended
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const updateTime = () => setCurrentTime(videoEl.currentTime);
    const updateDuration = () => {
      if (videoEl.duration && isFinite(videoEl.duration)) setDuration(videoEl.duration);
    };
    const updateBuffered = () => {
      const ranges: { start: number; end: number }[] = [];
      for (let i = 0; i < videoEl.buffered.length; i++) {
        ranges.push({
          start: videoEl.buffered.start(i),
          end: videoEl.buffered.end(i),
        });
      }
      setBuffered(ranges);
    };
    const handleEnded = () => {
      setHasEnded(true);
      setIsPlaying(false);
      announce('Video ended');
    };

    videoEl.addEventListener('timeupdate', updateTime);
    videoEl.addEventListener('loadedmetadata', updateDuration);
    videoEl.addEventListener('durationchange', updateDuration);
    videoEl.addEventListener('progress', updateBuffered);
    videoEl.addEventListener('ended', handleEnded);

    return () => {
      videoEl.removeEventListener('timeupdate', updateTime);
      videoEl.removeEventListener('loadedmetadata', updateDuration);
      videoEl.removeEventListener('durationchange', updateDuration);
      videoEl.removeEventListener('progress', updateBuffered);
      videoEl.removeEventListener('ended', handleEnded);
    };
  }, [announce]);

  // fullscreen change & clicks
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    const onClickOutside = () => setContextMenu(null);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('click', onClickOutside);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('click', onClickOutside);
    };
  }, []);

  // Cleanup inactivity timer
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  // toggle play
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (hasEnded) {
      v.currentTime = 0;
      setHasEnded(false);
      v.play();
      setIsPlaying(true);
      announce('Playing');
      return;
    }
    if (v.paused) {
      v.play();
      setIsPlaying(true);
      announce('Playing');
    } else {
      v.pause();
      setIsPlaying(false);
      announce('Paused');
    }
  }, [announce, hasEnded]);

  // skip
  const skip = useCallback((seconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
    announce(`${seconds > 0 ? 'Forward' : 'Back'} ${Math.abs(seconds)} seconds`);
  }, [announce]);

  // mute (stable)
  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
    if (!v.muted && (v.volume === 0 || isNaN(v.volume))) {
      v.volume = Math.max(0.1, volume);
      setVolume(v.volume);
    }
    announce(v.muted ? 'Muted' : `Unmuted, volume ${Math.round((v.volume ?? volume) * 100)} percent`);
  }, [announce, volume]);

  // fullscreen (stable)
  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    if (!document.fullscreenElement) {
      const p = c.requestFullscreen();
      if (p && typeof p.catch === 'function') p.catch(() => {/* ignore */});
      announce('Entered fullscreen');
    } else {
      const p = document.exitFullscreen();
      if (p && typeof p.catch === 'function') p.catch(() => {/* ignore */});
      announce('Exited fullscreen');
    }
  }, [announce]);

  // Play/pause handlers from UI
  const handleVideoClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (contextMenu) {
      e.stopPropagation();
      return;
    }
    togglePlay();
    handleActivity();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const newVolume = parseFloat(e.target.value);
    v.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    announce(`Volume ${Math.round(newVolume * 100)} percent`);
    handleActivity();
  };

  const changeSpeed = (speed: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    setPlaybackRate(speed);
    setShowSpeedMenu(false);
    announce(`Playback speed ${speed}x`);
    handleActivity();
  };

  const changeQuality = (id: number, label: string) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = id;
      setSelectedQuality(label);
      setShowQualityMenu(false);
      announce(`Quality ${label}`);
      handleActivity();
    }
  };

  // Robust keyboard handling ensuring F and M work.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as HTMLElement).isContentEditable
        )
      ) return;

      const code = e.code || '';
      const key = (e.key || '').toLowerCase();

      // letter accumulation for "party"
      if (key.length === 1 && /[a-z]/.test(key)) {
        typedBufferRef.current += key;
        if (typedBufferRef.current.length > 10) typedBufferRef.current = typedBufferRef.current.slice(-10);
        if (typedBufferRef.current.endsWith('party')) {
          setPartyMode((p) => {
            const newP = !p;
            announce(newP ? 'Party mode enabled' : 'Party mode disabled');
            return newP;
          });
          typedBufferRef.current = '';
          handleActivity();
          return; // Only return after toggling party mode
        }
        // Don't return here - let the key be processed by handlers below
      }

      // Accept both physical key (code) and logical key (key)
      if (code === 'Space' || key === ' ' || key === 'space') {
        e.preventDefault();
        togglePlay();
        handleActivity();
        return;
      }

      if (code === 'KeyF' || key === 'f') {
        e.preventDefault();
        toggleFullscreen();
        handleActivity();
        return;
      }

      if (code === 'KeyM' || key === 'm') {
        e.preventDefault();
        toggleMute();
        handleActivity();
        return;
      }

      switch (key) {
        case 'arrowright':
          e.preventDefault();
          skip(5);
          handleActivity();
          break;
        case 'arrowleft':
          e.preventDefault();
          skip(-5);
          handleActivity();
          break;
        case 'arrowup':
          e.preventDefault();
        {
          const v = videoRef.current;
          if (!v) return;
          const newVol = Math.min(1, (v.volume ?? volume) + 0.05);
          v.volume = newVol;
          setVolume(newVol);
          setIsMuted(newVol === 0);
          announce(`Volume ${Math.round(newVol * 100)} percent`);
          handleActivity();
        }
          break;
        case 'arrowdown':
          e.preventDefault();
        {
          const v = videoRef.current;
          if (!v) return;
          const newVol = Math.max(0, (v.volume ?? volume) - 0.05);
          v.volume = newVol;
          setVolume(newVol);
          setIsMuted(newVol === 0);
          announce(`Volume ${Math.round(newVol * 100)} percent`);
          handleActivity();
        }
          break;
        case '?':
          e.preventDefault();
          setShowKeyboardShortcuts((s) => !s);
          handleActivity();
          break;
        case 'escape':
          setShowSpeedMenu(false);
          setShowSettingsMenu(false);
          setShowQualityMenu(false);
          setShowVolumeSlider(false);
          setShowKeyboardShortcuts(false);
          handleActivity();
          break;
        default:
          break;
      }
    };

    // use capture to ensure our handler runs before other listeners that may stopPropagation
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [skip, togglePlay, toggleFullscreen, toggleMute, volume, announce, handleActivity]);

  const formatTime = (t: number) => {
    if (!t || !isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getWatchedPercent = () => (currentTime / (duration || 1)) * 100 || 0;

  // context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
    handleActivity();
  };

  const copyVideoUrl = async () => {
    await navigator.clipboard.writeText(video.src);
    setContextMenu(null);
    announce('Video URL copied to clipboard');
    handleActivity();
  };

  const copyCurrentTime = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('t', Math.floor(currentTime).toString());
    await navigator.clipboard.writeText(url.toString());
    setContextMenu(null);
    announce('Video URL with current time copied to clipboard');
    handleActivity();
  };

  const toggleLoop = () => {
    const v = videoRef.current;
    if (!v) return;
    v.loop = !v.loop;
    setIsLooping(v.loop);
    setContextMenu(null);
    announce(v.loop ? 'Loop enabled' : 'Loop disabled');
    handleActivity();
  };

  // progress interaction
  const seekFromClientX = (clientX: number) => {
    const v = videoRef.current;
    const progress = progressRef.current;
    if (!v || !progress || !duration) return;
    const rect = progress.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = percent * duration;
  };

  const onProgressMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    seekFromClientX(e.clientX);
    handleActivity();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) seekFromClientX(e.clientX);
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, duration]);

  // touch progress
  const onProgressTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    seekFromClientX(e.touches[0].clientX);
    handleActivity();
  };
  const onProgressTouchMove = (e: React.TouchEvent) => {
    if (isDragging) seekFromClientX(e.touches[0].clientX);
  };
  const onProgressTouchEnd = () => {
    setIsDragging(false);
    handleActivity();
  };

  // double-tap skip
  const onVideoTouchStart = (e: React.TouchEvent<HTMLVideoElement>) => {
    handleActivity();
    const t = Date.now();
    const x = e.touches[0].clientX;
    const last = lastTapRef.current;
    const gap = t - last;

    if (gap < 350 && lastTapXRef.current !== null) {
      const width = videoRef.current?.getBoundingClientRect().width || window.innerWidth;
      const zone = x / width;
      if (zone < 0.33) {
        skip(-10);
      } else if (zone > 0.66) {
        skip(10);
      } else {
        togglePlay();
      }
      lastTapRef.current = 0;
      lastTapXRef.current = null;
    } else {
      lastTapRef.current = t;
      lastTapXRef.current = x;
    }
  };

  // progress keyboard accessibility
  const onProgressKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      skip(5);
      handleActivity();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      skip(-5);
      handleActivity();
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (videoRef.current) videoRef.current.currentTime = 0;
      handleActivity();
    } else if (e.key === 'End') {
      e.preventDefault();
      if (videoRef.current) videoRef.current.currentTime = videoRef.current.duration || 0;
      handleActivity();
    }
  };

  // announcement timer cleanup
  useEffect(() => {
    return () => {
      if (announcementTimerRef.current) window.clearTimeout(announcementTimerRef.current);
    };
  }, []);

  // rainbow style
  const rainbowStyle = partyMode
    ? {
      animation: 'rainbow 3s linear infinite',
      background:
        'linear-gradient(90deg, rgba(255,0,0,1), rgba(255,154,0,1), rgba(208,222,33,1), rgba(79,220,74,1), rgba(63,218,216,1), rgba(47,201,226,1), rgba(28,127,238,1), rgba(95,21,242,1), rgba(186,12,248,1))',
      backgroundSize: '400% 400%',
    } as React.CSSProperties
    : {};

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden"
      onMouseMove={handleActivity}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleActivity}
    >
      <div aria-live="polite" className="sr-only" role="status">
        {announcement}
      </div>

      <video
        ref={videoRef}
        className="w-full bg-black select-none"
        poster={video.thumbnail}
        onClick={handleVideoClick}
        onContextMenu={handleContextMenu}
        onTouchStart={onVideoTouchStart}
        tabIndex={0}
        aria-label={`${video.title} video player`}
      >
        <source src={video.src} type="video/mp4" />
      </video>

      {(!isPlaying || hasEnded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
          <button
            onClick={(e) => {
              togglePlay();
              handleActivity();
            }}
            className="pointer-events-auto w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center hover:bg-blue-700 transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400"
            aria-label={hasEnded ? 'Replay video' : 'Play video'}
          >
            {hasEnded ? <RotateCcw className="w-10 h-10 text-white" /> : <Play className="w-10 h-10 text-white ml-1" />}
          </button>
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                togglePlay();
                handleActivity();
              }}
              aria-pressed={isPlaying}
              aria-label={isPlaying ? 'Pause' : hasEnded ? 'Replay' : 'Play'}
              className="text-white hover:text-blue-400 transition focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
            >
              {hasEnded ? <RotateCcw className="w-6 h-6" /> : isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            <div className="relative flex items-center gap-2">
              <button
                onClick={(e) => {
                  toggleMute();
                  handleActivity();
                }}
                aria-pressed={isMuted}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="text-white hover:text-blue-400 transition focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>

              {!isMobile && showVolumeSlider && (
                <input
                  aria-label="Volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20"
                />
              )}

              <button
                onClick={() => {
                  setShowVolumeSlider((s) => !s);
                  handleActivity();
                }}
                className="text-xs text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                aria-haspopup="true"
                aria-expanded={showVolumeSlider}
                aria-label="Show volume"
              >
                {Math.round(volume * 100)}%
              </button>
            </div>

            {!isMobile && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSpeedMenu((s) => !s);
                    handleActivity();
                  }}
                  className="text-white hover:text-blue-400 transition flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                  aria-haspopup="true"
                  aria-expanded={showSpeedMenu}
                  aria-label="Playback speed"
                >
                  <Gauge className="w-5 h-5" />
                  <span className="text-xs">{playbackRate}x</span>
                </button>
              </div>
            )}

            {showSpeedMenu && (
              <div role="menu" className="absolute bottom-20 left-4 right-4 md:left-auto md:right-auto md:bottom-16 bg-black/95 rounded-lg p-2 min-w-[100px] z-50">
                <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-2 px-2">
                  <span className="font-semibold text-white text-sm">Playback Speed</span>
                  <button onClick={() => setShowSpeedMenu(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
                </div>
                {speeds.map((s) => (
                  <button
                    role="menuitem"
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-800 rounded ${s === playbackRate ? 'text-blue-400' : 'text-white'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}

            <span className="text-sm text-gray-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isMobile && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu((s) => !s);
                    handleActivity();
                  }}
                  className="text-white hover:text-blue-400 transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                  aria-haspopup="true"
                  aria-expanded={showQualityMenu}
                  aria-label="Quality"
                >
                  {selectedQuality}
                </button>
              </div>
            )}

            {showQualityMenu && (
              <div role="menu" className="absolute bottom-20 left-4 right-4 md:left-auto md:right-auto md:bottom-16 bg-black/95 rounded-lg p-2 min-w-[100px] max-h-80 overflow-y-auto z-50">
                <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-2 px-2">
                  <span className="font-semibold text-white text-sm">Quality</span>
                  <button onClick={() => setShowQualityMenu(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
                </div>
                <button
                  role="menuitem"
                  onClick={() => changeQuality(-1, 'Auto')}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-800 rounded ${selectedQuality === 'Auto' ? 'text-blue-400' : 'text-white'}`}
                >
                  Auto
                </button>
                {availableQualities.map((q) => (
                  <button
                    role="menuitem"
                    key={q.id}
                    onClick={() => changeQuality(q.id, q.height)}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-800 rounded ${q.height === selectedQuality ? 'text-blue-400' : 'text-white'}`}
                  >
                    {q.height}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => {
                  setShowSettingsMenu((s) => !s);
                  handleActivity();
                }}
                className="text-white hover:text-blue-400 transition focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
                aria-haspopup="true"
                aria-expanded={showSettingsMenu}
                aria-label="Settings"
              >
                <Settings className="w-6 h-6" />
              </button>
              {showSettingsMenu && (
                <div role="menu" className="absolute bottom-full mb-2 right-0 bg-black/95 rounded-lg p-3 min-w-[200px] max-h-96 overflow-y-auto">
                  <div className="text-white text-sm space-y-2">
                    <div className="font-semibold border-b border-gray-700 pb-2">Settings</div>

                    {isMobile && (
                      <>
                        <button role="menuitem" onClick={() => { setShowSpeedMenu(true); setShowSettingsMenu(false); }} className="flex items-center justify-between w-full text-left px-2 py-1 hover:bg-gray-800 rounded">
                          <span>Speed</span>
                          <span className="text-gray-400">{playbackRate}x</span>
                        </button>
                        <button role="menuitem" onClick={() => { setShowQualityMenu(true); setShowSettingsMenu(false); }} className="flex items-center justify-between w-full text-left px-2 py-1 hover:bg-gray-800 rounded">
                          <span>Quality</span>
                          <span className="text-gray-400">{selectedQuality}</span>
                        </button>
                        <div className="border-t border-gray-700 my-1" />
                      </>
                    )}

                    <button role="menuitem" className="block w-full text-left px-2 py-1 hover:bg-gray-800 rounded">Subtitles (soon)</button>
                    <button role="menuitem" className="block w-full text-left px-2 py-1 hover:bg-gray-800 rounded">Annotations (soon)</button>
                    <button role="menuitem" onClick={toggleLoop} className="flex items-center justify-between w-full text-left px-2 py-1 hover:bg-gray-800 rounded">
                      <span>Loop</span>
                      {isLooping && <span className="text-blue-400">✓</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                toggleFullscreen();
                handleActivity();
              }}
              aria-label="Toggle fullscreen"
              className="text-white hover:text-blue-400 transition focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
            >
              <Maximize className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Progress bar: reverted to thin track and visible filled color */}
        <div
          ref={progressRef}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
          onKeyDown={onProgressKeyDown}
          className="relative h-1 bg-gray-900 cursor-pointer group/progress"
          onMouseMove={(e) => {
            handleActivity();
            if (progressRef.current && duration) {
              const rect = progressRef.current.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              setHoverTime(percent * (duration || 0));
            }
          }}
          onMouseLeave={() => setHoverTime(null)}
          onMouseDown={onProgressMouseDown}
          onTouchStart={onProgressTouchStart}
          onTouchMove={onProgressTouchMove}
          onTouchEnd={onProgressTouchEnd}
          aria-label="Video progress"
        >
          {buffered.map((range, i) => (
            <div
              key={i}
              className="absolute h-full bg-gray-700"
              style={{
                left: `${(range.start / (duration || 1)) * 100}%`,
                width: `${((range.end - range.start) / (duration || 1)) * 100}%`,
              }}
            />
          ))}

          <div
            className={`absolute h-full transition-all ${partyMode ? '' : 'bg-blue-600'}`}
            style={{
              width: `${getWatchedPercent()}%`,
              ...(partyMode ? rainbowStyle : {}),
            }}
          />

          {hoverTime !== null && duration > 0 && (
            <>
              <div className="absolute top-0 bottom-0 w-0.5 bg-white" style={{ left: `${(hoverTime / duration) * 100}%` }} />
              <div
                className="absolute -top-8 transform -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                style={{ left: `${(hoverTime / duration) * 100}%` }}
                aria-hidden
              >
                {formatTime(hoverTime)}
              </div>
            </>
          )}

          <div className="absolute inset-0 h-1 group-hover/progress:h-1.5 transition-all" />
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed bg-black/95 rounded-lg shadow-lg py-2 z-50 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          <button onClick={(e) => { togglePlay(); handleActivity(); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800" role="menuitem">
            {isPlaying ? 'Pause' : hasEnded ? 'Replay' : 'Play'}
          </button>
          <button onClick={(e) => { toggleMute(); handleActivity(); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800" role="menuitem">
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <div className="border-t border-gray-700 my-1" />
          <button onClick={copyVideoUrl} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800" role="menuitem">
            Copy video URL
          </button>
          <button onClick={copyCurrentTime} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800" role="menuitem">
            Copy video URL at current time
          </button>
          <div className="border-t border-gray-700 my-1" />
          <button onClick={toggleLoop} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex items-center justify-between" role="menuitem">
            <span>Loop</span>
            {isLooping && <span className="text-blue-400">✓</span>}
          </button>
          <div className="border-t border-gray-700 my-1" />
          <div className="px-4 py-2 text-xs text-gray-500">
            Stellicast Video Player v1.0
          </div>
        </div>
      )}

      {showKeyboardShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-black/90 text-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Keyboard shortcuts</h3>
              <button onClick={() => setShowKeyboardShortcuts(false)} className="text-sm underline">Close</button>
            </div>
            <ul className="grid grid-cols-2 gap-3 text-sm">
              <li><strong>Space</strong> — Play / Pause</li>
              <li><strong>← / →</strong> — Skip 5s</li>
              <li><strong>↑ / ↓</strong> — Volume</li>
              <li><strong>F</strong> — Fullscreen</li>
              <li><strong>M</strong> — Mute</li>
              <li><strong>?</strong> — Show shortcuts</li>
              <li><strong>Esc</strong> — Close menus</li>
              <li><strong>Type &quot;party&quot;</strong> — Toggle party mode</li>
            </ul>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rainbow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0; }
      `}</style>
    </div>
  );
}
