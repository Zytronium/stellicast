'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus, X, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import { ThumbsUpIcon, ThumbsUpIconHandle } from "@/components/ThumbsUpIcon";
import { ThumbsDownIcon, ThumbsDownIconHandle } from "@/components/ThumbsDownIcon";
import { StarIcon } from "@/components/StarIcon";
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import { formatTimeAgo } from '@/../lib/utils';
import { Comment as CommentComponent } from '@/components/Comment';
import type { Comment, CommentWithChildren, Video } from '@/../types';
import Card from '@/components/Card';

type ChannelInfo = {
  id?: string;
  display_name?: string;
  video_count?: number;
  follower_count?: number;
  handle?: string;
  avatar_url?: string | null;
};

async function fetchComments(videoId: string, page = 1, sort = 'newest') {
  const response = await fetch(
    `/api/videos/${videoId}/comments?page=${page}&sort=${sort}`
  );
  if (!response.ok) throw new Error('Failed to fetch comments');
  return response.json();
}

async function postComment(videoId: string, message: string) {
  const response = await fetch(`/api/videos/${videoId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to post comment');
  }
  return response.json();
}

function buildCommentTree(comments: Comment[]): CommentWithChildren[] {
  const map = new Map<string, CommentWithChildren>();
  comments.forEach(c => map.set(c.id, { ...c, children: [] }));

  const roots: CommentWithChildren[] = [];

  comments.forEach(c => {
    const node = map.get(c.id)!;
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function shouldCountView(videoId: string): boolean {
  try {
    const viewsKey = 'stellicast_views';
    const viewCooldown = 30 * 60 * 1000;

    const viewsData = localStorage.getItem(viewsKey);
    const views = viewsData ? JSON.parse(viewsData) : {};

    const lastViewTime = views[videoId];
    const now = Date.now();

    if (!lastViewTime || now - lastViewTime > viewCooldown) {
      views[videoId] = now;
      localStorage.setItem(viewsKey, JSON.stringify(views));
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking view cooldown:', error);
    return true;
  }
}

export default function WatchPageClient({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const [video, setVideo] = useState<Video | null>(null);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo>({});
  const [upNext, setUpNext] = useState<Video[]>([]);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [videosToShow, setVideosToShow] = useState(6);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [starred, setStarred] = useState(false);
  const [canStar, setCanStar] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showShareCopied, setShowShareCopied] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [likeLoading, setLikeLoading] = useState(false);
  const [dislikeLoading, setDislikeLoading] = useState(false);
  const [starLoading, setStarLoading] = useState(false);
  const likeIconRef = useRef<ThumbsUpIconHandle>(null);
  const dislikeIconRef = useRef<ThumbsDownIconHandle>(null);
  const [comments, setComments] = useState<CommentWithChildren[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [commentCount, setCommentCount] = useState(0);
  const [userLikedComments, setUserLikedComments] = useState<string[]>([]);
  const [userDislikedComments, setUserDislikedComments] = useState<string[]>([]);
  const [mobileCommentsExpanded, setMobileCommentsExpanded] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    async function loadComments() {
      if (!video) return;

      try {
        const data = await fetchComments(video.id);
        setComments(buildCommentTree(data.comments));
        setCommentCount(data.comments.length);

        if (data.userEngagement) {
          setUserLikedComments(data.userEngagement.likedComments || []);
          setUserDislikedComments(data.userEngagement.dislikedComments || []);
        }
      } catch (error) {
        console.error('Error loading comments:', error);
      } finally {
        setIsLoadingComments(false);
      }
    }
    loadComments();
  }, [video]);

  // Separate auth initialization from data loading
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const supabase = createSupabaseBrowserClient();

        // Give the client a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 100));

        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Auth initialization error:', error);
          // Don't block the page load if auth fails
          setAuthReady(true);
          return;
        }

        if (session?.user) {
          setIsAuthenticated(true);
          setCurrentUserId(session.user.id);

          // Fetch user engagement data
          const { data: userData } = await supabase
            .from('users')
            .select('liked_videos, disliked_videos, starred_videos')
            .eq('id', session.user.id)
            .single();

          if (mounted && userData) {
            const resolvedParams = await Promise.resolve(params);
            const { id } = resolvedParams;

            setLiked(userData.liked_videos?.includes(id) || false);
            setDisliked(userData.disliked_videos?.includes(id) || false);
            setStarred(userData.starred_videos?.includes(id) || false);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setAuthReady(true);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [params]);

  // Load video data only after auth is ready
  useEffect(() => {
    if (!authReady) return;

    let mounted = true;

    async function loadData() {
      const resolvedParams = await Promise.resolve(params);
      const { id } = resolvedParams;

      try {
        setLoading(true);

        // Fetch video data
        const videoRes = await fetch(`/api/videos/${id}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (!mounted) return;

        if (!videoRes.ok) {
          if (videoRes.status === 404) {
            notFound();
            return;
          }
          throw new Error(`Failed to fetch video: ${videoRes.status}`);
        }

        const videoData = await videoRes.json();

        const videoObj: Video = {
          id: videoData.id,
          title: videoData.title,
          description: videoData.description ?? '',
          thumbnail: videoData.thumbnail_url ?? videoData.thumbnail ?? '',
          channel: videoData.channels?.id ?? videoData.channel_id ?? '',
          views: videoData.view_count ?? videoData.views ?? 0,
          contentSrc: videoData.video_url ?? videoData.content_src ?? '',
          uploadedAt: videoData.created_at ? new Date(videoData.created_at) : new Date(),
          updatedAt: videoData.updated_at ? new Date(videoData.updated_at) : (videoData.created_at ? new Date(videoData.created_at) : new Date()),
          stars: videoData.star_count ?? videoData.stars ?? 0,
          likes: videoData.like_count ?? videoData.likes ?? 0,
          dislikes: videoData.dislike_count ?? videoData.dislikes ?? 0,
          comments: videoData.comment_count ?? videoData.comments ?? 0,
          duration: videoData.duration ?? 0,
          visibility: videoData.visibility ?? 'public',
          tags: Array.isArray(videoData.tags) ? videoData.tags : [],
          isAI: videoData.is_ai ?? false,
          isPromotional: videoData.is_promotional ?? false,
        };

        // Channel info used by the UI (was previously inlined on the video object)
        const channel: ChannelInfo = {
          id: videoData.channels?.id ?? videoData.channel_id,
          display_name: videoData.channels?.display_name ?? 'Unknown Creator',
          video_count: videoData.channels?.video_count ?? videoData.channels?.video_count ?? 0,
          follower_count: videoData.channels?.follower_count ?? videoData.channels?.follower_count ?? 0,
          handle: videoData.channels?.handle ?? videoData.channels?.slug ?? '',
          avatar_url: videoData.channels?.avatar_url ?? null,
        };

        if (!mounted) return;

        setVideo(videoObj);
        setChannelInfo(channel);
        document.title = `${videoObj.title} - Stellicast`;

        // Handle view counting
        if (shouldCountView(id)) {
          fetch(`/api/videos/${id}/view`, { method: 'POST' })
            .then(async res => {
              const data = await res.json();
              if (res.status === 429) {
                console.log('View rate limited:', data.message);
                return;
              }
              if (mounted && data.success && data.view_count !== undefined) {
                setVideo(prev => prev ? { ...prev, views: data.view_count } : null);
              }
            })
            .catch(error => console.error('Error incrementing view:', error));
        }

        // Fetch related videos
        const allRes = await fetch(`/api/videos`);
        if (allRes.ok) {
          const allData = await allRes.json();
          const videos = Array.isArray(allData.videos) ? allData.videos : [];
          const filteredVideos = videos.filter((v: any) => v.id !== id);

          if (mounted) {
            setAllVideos(filteredVideos);
            setUpNext(filteredVideos.slice(0, 6));
          }
        }

        if (mounted) {
          setRetryCount(0);
        }
      } catch (error) {
        console.error('Error loading video:', error);

        if (!mounted) return;

        // Retry logic for transient failures
        if (retryCount < maxRetries) {
          console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            loadData();
          }, 1000 * (retryCount + 1)); // Exponential backoff
        } else {
          // Give up after max retries
          notFound();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [authReady, params, retryCount]);

  useEffect(() => {
    if (!video) return;
    const requiredWatchTime = (video.duration || 0) * 0.20;
    setCanStar(watchedSeconds >= requiredWatchTime);
  }, [watchedSeconds, video]);

  useEffect(() => {
    setUpNext(allVideos.slice(0, videosToShow));
  }, [videosToShow, allVideos]);

  const handleWatchedTimeUpdate = (seconds: number) => {
    setWatchedSeconds(seconds);
  };

  const refreshComments = async () => {
    if (!video) return;
    try {
      const data = await fetchComments(video.id);
      setComments(buildCommentTree(data.comments));
      setCommentCount(data.comments.length);

      if (data.userEngagement) {
        setUserLikedComments(data.userEngagement.likedComments || []);
        setUserDislikedComments(data.userEngagement.dislikedComments || []);
      }
    } catch (error) {
      console.error('Error refreshing comments:', error);
    }
  };

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || !video) return;

    if (!isAuthenticated) {
      alert('Please sign in to comment');
      return;
    }

    try {
      await postComment(video.id, newComment.trim());
      setNewComment('');
      setShowCommentModal(false);
      await refreshComments();
    } catch (error: any) {
      alert(error.message || 'Failed to post comment');
    }
  };

  const handleLikeClick = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to like videos');
      return;
    }

    if (likeLoading || !video) return;

    setLikeLoading(true);
    const wasLiked = liked;

    try {
      const response = await fetch(`/api/videos/${video.id}/like`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.status === 429) {
        alert(data.message || 'Please wait before liking again');
        setLikeLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to like video');
      }

      setLiked(data.liked);
      if (data.liked && disliked) {
        setDisliked(false);
      }

      setVideo(prev => prev ? {
        ...prev,
        likes: data.like_count ?? data.likes ?? prev.likes,
        dislikes: data.dislike_count ?? data.dislikes ?? prev.dislikes
      } : null);

      if (data.liked && !wasLiked) {
        likeIconRef.current?.startAnimation();
      }

    } catch (error) {
      console.error('Error liking video:', error);
      alert('Failed to like video. Please try again.');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDislikeClick = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to dislike videos');
      return;
    }

    if (dislikeLoading || !video) return;

    setDislikeLoading(true);
    const wasDisliked = disliked;

    try {
      const response = await fetch(`/api/videos/${video.id}/dislike`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.status === 429) {
        alert(data.message || 'Please wait before disliking again');
        setDislikeLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to dislike video');
      }

      setDisliked(data.disliked);
      if (data.disliked && liked) {
        setLiked(false);
      }

      setVideo(prev => prev ? {
        ...prev,
        likes: data.like_count ?? data.likes ?? prev.likes,
        dislikes: data.dislike_count ?? data.dislikes ?? prev.dislikes
      } : null);

      if (data.disliked && !wasDisliked) {
        dislikeIconRef.current?.startAnimation();
      }

    } catch (error) {
      console.error('Error disliking video:', error);
      alert('Failed to dislike video. Please try again.');
    } finally {
      setDislikeLoading(false);
    }
  };

  const handleStarClick = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to star videos');
      return;
    }

    if (!canStar) {
      const requiredSeconds = Math.ceil((video?.duration || 0) * 0.20);
      alert(`You must watch at least 20% of the video (${requiredSeconds} seconds) or 15 minutes (whichever is shorter) to star it. You've watched ${watchedSeconds} seconds so far.`);
      return;
    }

    if (starLoading || !video) return;

    setStarLoading(true);

    try {
      const response = await fetch(`/api/videos/${video.id}/star`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ watchedSeconds }),
      });

      const data = await response.json();

      if (response.status === 429) {
        alert(data.message || 'Please wait before starring again');
        setStarLoading(false);
        return;
      }

      if (response.status === 403) {
        alert(data.message || 'You need to watch more of the video to star it');
        setStarLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to star video');
      }

      setStarred(data.starred);

      setVideo(prev => prev ? {
        ...prev,
        stars: data.star_count ?? data.stars ?? prev.stars
      } : null);

    } catch (error) {
      console.error('Error starring video:', error);
      alert('Failed to star video. Please try again.');
    } finally {
      setStarLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setShowShareCopied(true);
      setTimeout(() => setShowShareCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleLoadMore = () => {
    setVideosToShow(prev => prev + 6);
  };

  if (loading || !authReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-400">Loading...</div>
          {retryCount > 0 && (
            <div className="text-sm text-gray-500 mt-2">
              Retry attempt {retryCount}/{maxRetries}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!video) {
    notFound();
    return null;
  }

  // Create a compatibility object for components (VideoPlayer and any legacy UI expecting previous keys).
  // Casting to any keeps TypeScript from complaining if those components still expect the old shape.
  const playerVideo: any = {
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnail: video.thumbnail,
    src: video.contentSrc,
    duration: video.duration,
    created_at: video.uploadedAt ? video.uploadedAt.toISOString() : undefined,
    view_count: video.views,
    star_count: video.stars,
    like_count: video.likes,
    dislike_count: video.dislikes,
    creator: channelInfo.display_name ?? 'Unknown Creator',
    creator_videos: channelInfo.video_count ?? 0,
    creator_followers: channelInfo.follower_count ?? 0,
    creator_handle: channelInfo.handle ?? '',
    creator_avatar: channelInfo.avatar_url ?? null,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1800px] mx-auto px-4">
      {/* Main Content - Video and Info */}
      <div className="flex-1 min-w-0">
        {/* Video Player */}
        <VideoPlayer video={playerVideo} onWatchedTimeUpdate={handleWatchedTimeUpdate} />

        {/* Video Info */}
        <div className="mt-4 space-y-3">
          {/* Title */}
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold px-0 wrap-break-word max-w-[90vw]">{video.title}</h1>

          {/* Channel Info & Actions - Mobile Optimized */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 lg:justify-between">
            {/* Channel Info */}
            <div className="flex items-center justify-between sm:justify-start gap-3 lg:gap-4 rounded-2xl border border-gray-800 bg-[#0a0a0a] p-3">
              <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
                <Link
                  href={`/channel/${channelInfo.handle ?? ''}`}
                  className="grid h-10 w-10 place-items-center rounded-full bg-zinc-600 text-sm font-bold text-white flex-shrink-0 overflow-hidden"
                >
                  {channelInfo.avatar_url ? (
                    <img
                      src={channelInfo.avatar_url}
                      alt={channelInfo.display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    channelInfo.display_name?.[0]?.toUpperCase() ?? "C"
                  )}
                </Link>
                <div className="min-w-0 sm:min-w-0">
                  <Link
                    href={`/channel/${channelInfo.handle ?? ''}`}
                    className="text-sm font-semibold text-gray-100 block truncate sm:inline"
                  >
                    {channelInfo.display_name ?? 'Unknown Creator'}
                  </Link>
                  <div className="text-xs text-gray-400">
                    {channelInfo.video_count ?? 0} video
                    {channelInfo.video_count === 1 ? "" : "s"} •{" "}
                    {channelInfo.follower_count ?? 0} follower
                    {channelInfo.follower_count === 1 ? "" : "s"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="rounded-full bg-blue-600 px-4 sm:px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 transition flex-shrink-0"
              >
                Follow
              </button>
            </div>

            {/* Action Buttons - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row lg:flex lg:items-center gap-3 lg:gap-3">
              {/* Like/Dislike - Mobile takes full width */}
              <div className="flex items-center justify-between sm:justify-start gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-3 lg:p-0 lg:bg-transparent lg:border-0">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col lg:flex-col rounded-lg overflow-hidden border border-gray-800">
                    <button
                      onClick={handleLikeClick}
                      disabled={likeLoading}
                      className={`flex items-center justify-center px-4 py-2.5 lg:px-3 lg:py-2 text-sm transition ${
                        liked ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                      } ${likeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <ThumbsUpIcon ref={likeIconRef} className="w-5 h-5 lg:w-4 lg:h-4" />
                    </button>
                    <div className="h-px bg-gray-800"></div>
                    <button
                      onClick={handleDislikeClick}
                      disabled={dislikeLoading}
                      className={`flex items-center justify-center px-4 py-2.5 lg:px-3 lg:py-2 text-sm transition ${
                        disliked ? 'bg-red-600 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                      } ${dislikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <ThumbsDownIcon ref={dislikeIconRef} className="w-5 h-5 lg:w-4 lg:h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col text-sm lg:text-xs text-gray-400 gap-3">
                    <span className="whitespace-nowrap lg:hidden font-medium">{video.likes} like{video.likes === 1 ? '' : 's'}</span>
                    <span className="hidden lg:inline whitespace-nowrap">{video.likes} like{video.likes === 1 ? '' : 's'}</span>
                    <span className="whitespace-nowrap lg:hidden font-medium">{video.dislikes} dislike{video.dislikes === 1 ? '' : 's'}</span>
                    <span className="hidden lg:inline whitespace-nowrap">{video.dislikes} dislike{video.dislikes === 1 ? '' : 's'}</span>
                  </div>
                </div>

                {/* Star - Mobile inline with like/dislike */}
                <div className="flex items-center gap-2.5 lg:hidden">
                  <button
                    onClick={handleStarClick}
                    disabled={!canStar || starLoading}
                    className={`transition ${
                      canStar && !starLoading ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'
                    } ${starLoading ? 'opacity-50' : ''}`}
                    title={!canStar ? `Watch ${Math.ceil((video.duration || 0) * 0.20)}s (20%) to star` : ''}
                  >
                    <StarIcon
                      className={`w-9 h-9 transition ${
                        starred ? 'text-yellow-500' : canStar ? 'text-gray-400' : 'text-gray-600'
                      }`}
                      fill={starred ? 'currentColor' : '#1c263a'}
                    />
                  </button>
                  <div>
                    <span className={`text-sm font-semibold ${starred ? 'text-yellow-500' : canStar ? 'text-gray-300' : 'text-gray-600'}`}>
                      {video.stars} star{video.stars === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Star - Desktop only (separate from like/dislike) */}
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={handleStarClick}
                  disabled={!canStar || starLoading}
                  className={`transition ${
                    canStar && !starLoading ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'
                  } ${starLoading ? 'opacity-50' : ''}`}
                  title={!canStar ? `Watch ${Math.ceil((video.duration || 0) * 0.20)}s (20%) to star` : ''}
                >
                  <StarIcon
                    className={`w-8 h-8 transition ${
                      starred ? 'text-yellow-500' : canStar ? 'text-gray-400' : 'text-gray-600'
                    }`}
                    fill={starred ? 'currentColor' : '#1c263a'}
                  />
                </button>
                <span className={`text-sm font-medium whitespace-nowrap ${starred ? 'text-yellow-500' : canStar ? 'text-gray-300' : 'text-gray-600'}`}>
                  {video.stars} star{video.stars === 1 ? '' : 's'}
                </span>
              </div>

              {/* Share */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 lg:py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl lg:rounded-lg transition"
                >
                  <Share2 className="w-5 h-5 lg:w-4 lg:h-4" />
                  <span className="text-sm font-medium">Share</span>
                </button>
                {showShareCopied && (
                  <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg z-10">
                    Link copied!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-gray-800 bg-[#0a0a0a] p-4">
            <details open className="group">
              <summary className="cursor-pointer list-none text-sm font-semibold text-gray-100">
                Description
                <span className="ml-2 text-xs font-normal text-gray-400 group-open:hidden">
                  (click to expand)
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-400">
                  {video.views} view{video.views === 1 ? '' : 's'} • Published {video.uploadedAt ? formatTimeAgo(video.uploadedAt.toISOString()) : 'recently'}
                </p>
                <div className="text-sm leading-relaxed text-gray-300">
                  {(video.description ?? '').split('\n').map((line, i) => (
                    <p key={i} className={`${i === 0 ? '' : 'mt-3'} wrap-break-word max-w-[80vw]`}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Mobile Comments Section - Between Description and More Videos */}
        <div className="lg:hidden mt-6">
          <div className="rounded-2xl border border-gray-800 bg-[#0a0a0a] overflow-hidden">
            {/* Comments Header - Clickable to expand */}
            <button
              onClick={() => setMobileCommentsExpanded(!mobileCommentsExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-900/30 transition"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{commentCount} Comment{commentCount === 1 ? '' : 's'}</h2>
              </div>
              {mobileCommentsExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* First Comment Preview - Always visible when collapsed */}
            {!mobileCommentsExpanded && comments.length > 0 && (
              <div className="px-4 pb-4 border-t border-gray-800">
                <div className="pt-3">
                  <CommentComponent
                    comment={comments[0]}
                    videoId={video.id}
                    currentUserId={currentUserId}
                    userLikedComments={userLikedComments}
                    userDislikedComments={userDislikedComments}
                    onReplySubmit={refreshComments}
                    onCommentUpdate={refreshComments}
                  />
                </div>
              </div>
            )}

            {/* Expanded Comments */}
            {mobileCommentsExpanded && (
              <div className="border-t border-gray-800">
                <div className="p-4">
                  <button
                    onClick={() => setShowCommentModal(true)}
                    className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-500 transition mb-4"
                  >
                    <Plus className="w-4 h-4" />
                    Add Comment
                  </button>

                  <div className="space-y-1 max-h-[600px] overflow-y-auto">
                    {isLoadingComments ? (
                      <p className="text-sm text-gray-400 text-center py-8">Loading comments...</p>
                    ) : comments.length > 0 ? (
                      comments.map((comment) => (
                        <CommentComponent
                          key={comment.id}
                          comment={comment}
                          videoId={video.id}
                          currentUserId={currentUserId}
                          userLikedComments={userLikedComments}
                          userDislikedComments={userDislikedComments}
                          onReplySubmit={refreshComments}
                          onCommentUpdate={refreshComments}
                        />
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-8">No comments yet. Be the first to comment!</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* More Videos */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">More Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upNext.map((v: any) => (
              <Card key={v.id} id={v.id} title={v.title} creator_name={v.creator} date={v.created_at}
                    thumbnail_src={v.thumbnail_url} is_ai={v.is_ai} views={v.view_count} duration={v.duration}/>
            ))}
          </div>
          {upNext.length < allVideos.length && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments Sidebar - Desktop Only */}
      <div className="hidden lg:flex w-96 bg-gray-900/50 rounded-lg p-4 flex-col h-[calc(100vh-8rem)] sticky top-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{commentCount} Comment{commentCount === 1 ? '' : 's'}</h2>
        </div>

        <div className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none"
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setNewComment('')}
              className="px-4 py-1.5 text-sm text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCommentSubmit}
              disabled={!newComment.trim()}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition"
            >
              Comment
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingComments ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading comments...</p>
          ) : comments.length > 0 ? (
            <div className="space-y-1">
              {comments.map((comment) => (
                <CommentComponent
                  key={comment.id}
                  comment={comment}
                  videoId={video.id}
                  currentUserId={currentUserId}
                  userLikedComments={userLikedComments}
                  userDislikedComments={userDislikedComments}
                  onReplySubmit={refreshComments}
                  onCommentUpdate={refreshComments}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No comments yet. Be the first to comment!</p>
          )}
        </div>
      </div>

      {/* Mobile Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end lg:hidden">
          <div className="bg-gray-900 rounded-t-2xl w-full p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Comment</h3>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setNewComment('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your comment..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none mb-4"
              rows={5}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setNewComment('');
                }}
                className="flex-1 px-4 py-2 text-sm border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim()}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition"
              >
                Post Comment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
