'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus, X, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import FollowButton from '@/components/FollowButton';
import { ThumbsUpIcon, ThumbsUpIconHandle } from "@/components/ThumbsUpIcon";
import { ThumbsDownIcon, ThumbsDownIconHandle } from "@/components/ThumbsDownIcon";
import { StarIcon } from "@/components/StarIcon";
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import { formatTimeAgo } from '@/../lib/utils';
import { Comment as CommentComponent } from '@/components/Comment';
import { interactionQueue } from '@/../lib/interaction-queue';
import { showErrorToast } from '@/../lib/toast-manager';
import type { Comment, CommentWithChildren, Video } from '@/../types';
import Card from '@/components/Card';
import Script from 'next/script';

const PONG_UUID = 'b74faa54-7a9c-5c1d-8a4c-9612bdf4abe6';

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

export default function WatchPageClient({ params }: {
  params: { id: string } | Promise<{ id: string }>
}) {
  const [video, setVideo] = useState<Video | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo>({});
  const [isFollowing, setIsFollowing] = useState(false);
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
  const [isPongRoute, setIsPongRoute] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    async function loadComments() {
      if (!videoId) return;

      try {
        const data = await fetchComments(videoId);
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
  }, [videoId]);

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

        // Use params instead of URL
        const resolvedParams = await Promise.resolve(params);
        const id = resolvedParams.id;

        // Determine video ID from id (which could be slug or UUID)
        let effectiveId: string;
        if (id === 'pong') {
          effectiveId = PONG_UUID;
          if (mounted) setIsPongRoute(true);
        } else {
          // Look up video by slug to get UUID
          const { data: videoData, error: lookupError } = await supabase
            .from('videos')
            .select('id')
            .eq('slug', id)
            .single();

          if (lookupError || !videoData) {
            // Try by UUID as fallback
            const { data: videoById, error: idError } = await supabase
              .from('videos')
              .select('id')
              .eq('id', id)
              .single();

            if (idError || !videoById) {
              // Video not found - set states and let the component handle 404
              if (mounted) {
                setAuthReady(true);
                setLoading(false);
                setVideoId(null);
              }
              return;
            }
            effectiveId = videoById.id;
          } else {
            effectiveId = videoData.id;
          }
        }

        if (mounted) {
          setVideoId(effectiveId);
        }

        if (session?.user) {
          setIsAuthenticated(true);
          setCurrentUserId(session.user.id);

          // Fetch engagement state using effectiveId
          const [likeResult, dislikeResult, starResult] = await Promise.all([
            supabase
              .from('video_likes')
              .select('id')
              .eq('user_id', session.user.id)
              .eq('video_id', effectiveId)
              .maybeSingle(),
            supabase
              .from('video_dislikes')
              .select('id')
              .eq('user_id', session.user.id)
              .eq('video_id', effectiveId)
              .maybeSingle(),
            supabase
              .from('video_stars')
              .select('id')
              .eq('user_id', session.user.id)
              .eq('video_id', effectiveId)
              .maybeSingle()
          ]);

          if (mounted) {
            setLiked(!!(likeResult && likeResult.data));
            setDisliked(!!(dislikeResult && dislikeResult.data));
            setStarred(!!(starResult && starResult.data));
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

  // Load video data only after we have the video ID
  useEffect(() => {
    if (!authReady || !videoId) return;

    let mounted = true;
    let cleanupFn: (() => void) | undefined;

    async function loadData() {
      if (!videoId)
        return;

      const currentVideoId = videoId;
      const resolvedParams = await Promise.resolve(params);
      const id = resolvedParams.id;

      if (id === 'pong') {
        const handleKeyDown = (e: KeyboardEvent) => {
          if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
          }
        };

        window.addEventListener('keydown', handleKeyDown, { passive: false });

        cleanupFn = () => {
          window.removeEventListener('keydown', handleKeyDown);
        };
      }

      try {
        setLoading(true);

        // Use videoId for all fetches
        const videoRes = await fetch(`/api/videos/${currentVideoId}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
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
          slug: videoData.slug,
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

        // Channel info
        const channel: ChannelInfo = {
          id: videoData.channels?.id ?? videoData.channel_id,
          display_name: videoData.channels?.display_name ?? 'Unknown Creator',
          video_count: videoData.channels?.video_count ?? 0,
          follower_count: videoData.channels?.follower_count ?? 0,
          handle: videoData.channels?.handle ?? videoData.channels?.slug ?? '',
          avatar_url: videoData.channels?.avatar_url ?? null,
        };

        if (!mounted) return;

        setVideo(videoObj);
        setChannelInfo(channel);
        document.title = `${videoObj.title} - Stellicast`;

        // Handle view counting using videoId
        if (shouldCountView(currentVideoId)) {
          fetch(`/api/videos/${currentVideoId}/view`, { method: 'POST' })
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
            .catch(err => console.error('Error incrementing view:', err));
        }

        // Fetch related videos with videoId excluded
        const allRes = await fetch(`/api/videos`);
        if (allRes.ok) {
          const allData = await allRes.json();
          const videos = Array.isArray(allData.videos) ? allData.videos : [];
          const filteredVideos = videos.filter((v: any) => v.id !== currentVideoId);

          if (mounted) {
            setAllVideos(filteredVideos);
            setUpNext(filteredVideos.slice(0, 6));
          }
        }

        if (mounted) setRetryCount(0);
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
        if (mounted) setLoading(false);
      }
    }

    loadData()
      .catch(err => {
        console.error('loadData error:', err);
      });

    return () => {
      mounted = false;
      if (typeof cleanupFn === 'function') cleanupFn();
    };
  }, [authReady, videoId, params, retryCount]);

  useEffect(() => {
    if (!video) return;
    const requiredWatchTime = (video.duration || 0) * 0.20;
    setCanStar(watchedSeconds >= requiredWatchTime);
  }, [watchedSeconds, video]);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!channelInfo.id) return;

      try {
        const response = await fetch(`/api/follow?channelId=${channelInfo.id}`);
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.isFollowing);
        } else {
          console.error('Failed to check follow status:', await response.text());
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      }
    };

    checkFollowStatus();
  }, [channelInfo.id]);

  useEffect(() => {
    setUpNext(allVideos.slice(0, videosToShow));
  }, [videosToShow, allVideos]);

  const handleWatchedTimeUpdate = (seconds: number) => {
    setWatchedSeconds(seconds);
  };

  const refreshComments = async () => {
    if (!videoId) return;
    try {
      const data = await fetchComments(videoId);
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
    if (!newComment.trim() || !videoId) return;

    if (!isAuthenticated) {
      alert('Please sign in to comment');
      return;
    }

    try {
      await postComment(videoId, newComment.trim());
      setNewComment('');
      setShowCommentModal(false);
      await refreshComments();
    } catch (error: any) {
      alert(error.message || 'Failed to post comment');
    }
  };

  const handleLikeClick = useCallback(async () => {
    if (!isAuthenticated) {
      alert('Please sign in to like videos');
      return;
    }

    if (!video || !videoId || likeLoading) return;

    // Check if there's already a request in flight
    if (interactionQueue.isRequestInFlight('like', videoId)) {
      console.log('Like request already in flight, ignoring click');
      return;
    }

    setLikeLoading(true);

    // Store original state for rollback
    const wasLiked = liked;
    const wasDisliked = disliked;
    const originalLikes = video.likes;
    const originalDislikes = video.dislikes;

    // Calculate new state (toggle like)
    const newLiked = !wasLiked;
    const newDisliked = false;

    // Calculate count changes
    let likesDelta = newLiked ? 1 : -1;
    let dislikesDelta = wasDisliked ? -1 : 0;

    // Apply optimistic update
    setLiked(newLiked);
    setDisliked(newDisliked);
    setVideo(prev => prev ? {
      ...prev,
      likes: originalLikes + likesDelta,
      dislikes: originalDislikes + dislikesDelta
    } : null);

    if (newLiked && !wasLiked) {
      likeIconRef.current?.startAnimation();
    }

    const performLike = async () => {
      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.status === 429) {
        const error = new Error(data.message || 'Rate limited');
        (error as any).status = 429;
        throw error;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to like video');
      }

      // Update with server truth
      setLiked(data.liked);
      if (data.liked) {
        setDisliked(false);
      }
      setVideo(prev => prev ? {
        ...prev,
        likes: data.like_count,
        dislikes: data.dislike_count
      } : null);
    };

    const requestPromise = performLike();
    interactionQueue.registerInFlight('like', videoId, requestPromise);

    try {
      await requestPromise;
    } catch (error: any) {
      if (error.status === 429) {
        // Rate limited - queue for retry
        interactionQueue.queueForRetry(
          'like',
          videoId,
          performLike,
          (errorMsg) => {
            // Rollback on final error
            setLiked(wasLiked);
            setDisliked(wasDisliked);
            setVideo(prev => prev ? {
              ...prev,
              likes: originalLikes,
              dislikes: originalDislikes
            } : null);
            showErrorToast(`Failed to like video: ${errorMsg}`);
          },
          () => {
            console.log('Like action completed after retry');
          }
        );
      } else {
        // Other error - rollback immediately
        setLiked(wasLiked);
        setDisliked(wasDisliked);
        setVideo(prev => prev ? {
          ...prev,
          likes: originalLikes,
          dislikes: originalDislikes
        } : null);
        showErrorToast('Failed to like video. Please try again.');
        console.error('Error liking video:', error);
      }
    } finally {
      setLikeLoading(false);
    }
  }, [isAuthenticated, likeLoading, video, videoId, liked, disliked]);

  const handleDislikeClick = useCallback(async () => {
    if (!isAuthenticated) {
      alert('Please sign in to dislike videos');
      return;
    }

    if (!video || !videoId || dislikeLoading) return;

    if (interactionQueue.isRequestInFlight('dislike', videoId)) {
      console.log('Dislike request already in flight, ignoring click');
      return;
    }

    setDislikeLoading(true);

    // Store original state for rollback
    const wasDisliked = disliked;
    const wasLiked = liked;
    const originalLikes = video.likes;
    const originalDislikes = video.dislikes;

    // Calculate new state
    const newDisliked = !wasDisliked;
    const newLiked = false;

    // Calculate count changes
    let likesDelta = wasLiked ? -1 : 0;
    let dislikesDelta = newDisliked ? 1 : -1;

    setDisliked(newDisliked);
    setLiked(newLiked);
    setVideo(prev => prev ? {
      ...prev,
      dislikes: originalDislikes + dislikesDelta,
      likes: originalLikes + likesDelta
    } : null);

    if (newDisliked && !wasDisliked) {
      dislikeIconRef.current?.startAnimation();
    }

    const performDislike = async () => {
      const response = await fetch(`/api/videos/${videoId}/dislike`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.status === 429) {
        const error = new Error(data.message || 'Rate limited');
        (error as any).status = 429;
        throw error;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to dislike video');
      }

      // Update with actual server data
      setDisliked(data.disliked);
      if (data.disliked) {
        setLiked(false);
      }
      setVideo(prev => prev ? {
        ...prev,
        likes: data.like_count,
        dislikes: data.dislike_count
      } : null);
    };

    const requestPromise = performDislike();
    interactionQueue.registerInFlight('dislike', videoId, requestPromise);

    try {
      await requestPromise;
    } catch (error: any) {
      if (error.status === 429) {
        // Rate limited - queue for retry
        interactionQueue.queueForRetry(
          'dislike',
          videoId,
          performDislike,
          (errorMsg) => {
            // Rollback on final error
            setDisliked(wasDisliked);
            setLiked(wasLiked);
            setVideo(prev => prev ? {
              ...prev,
              likes: originalLikes,
              dislikes: originalDislikes
            } : null);
            showErrorToast(`Failed to dislike video: ${errorMsg}`);
          },
          () => {
            console.log('Dislike action completed after retry');
          }
        );
      } else {
        // Other error - rollback immediately
        setDisliked(wasDisliked);
        setLiked(wasLiked);
        setVideo(prev => prev ? {
          ...prev,
          likes: originalLikes,
          dislikes: originalDislikes
        } : null);
        showErrorToast('Failed to dislike video. Please try again.');
        console.error('Error disliking video:', error);
      }
    } finally {
      setDislikeLoading(false);
    }
  }, [isAuthenticated, dislikeLoading, video, videoId, liked, disliked]);

  const handleStarClick = useCallback(async () => {
    if (!isAuthenticated) {
      alert('Please sign in to star videos');
      return;
    }

    if (!canStar && !starred) {
      const requiredSeconds = Math.ceil((video?.duration || 0) * 0.20);
      alert(`You must watch at least 20% of the video (${requiredSeconds} seconds) or 15 minutes (whichever is shorter) to star it. You've watched ${watchedSeconds} seconds so far.`);
      return;
    }

    if (!video || !videoId || starLoading) return;

    if (interactionQueue.isRequestInFlight('star', videoId)) {
      console.log('Star request already in flight, ignoring click');
      return;
    }

    setStarLoading(true);

    // Store original state for rollback
    const wasStarred = starred;
    const originalStars = video.stars;

    // Toggle star state
    const newStarred = !wasStarred;

    // Apply optimistic update
    setStarred(newStarred);
    setVideo(prev => prev ? {
      ...prev,
      stars: originalStars + (newStarred ? 1 : -1)
    } : null);

    const performStar = async () => {
      const watchedSecs = Math.floor(watchedSeconds);

      const response = await fetch(`/api/videos/${videoId}/star`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ watchedSeconds: watchedSecs }),
      });

      const data = await response.json();

      if (response.status === 429) {
        const error = new Error(data.message || 'Rate limited');
        (error as any).status = 429;
        throw error;
      }

      if (response.status === 403) {
        const error = new Error(data.message || 'You need to watch more of the video to star it');
        (error as any).status = 403;
        throw error;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to star video');
      }

      // Update with actual server data
      setStarred(data.starred);
      setVideo(prev => prev ? {
        ...prev,
        stars: data.star_count
      } : null);
    };

    const requestPromise = performStar();
    interactionQueue.registerInFlight('star', videoId, requestPromise);

    try {
      await requestPromise;
    } catch (error: any) {
      if (error.status === 429) {
        // Rate limited - queue for retry
        interactionQueue.queueForRetry(
          'star',
          videoId,
          performStar,
          (errorMsg) => {
            // Rollback on final error
            setStarred(wasStarred);
            setVideo(prev => prev ? {
              ...prev,
              stars: originalStars
            } : null);
            showErrorToast(`Failed to star video: ${errorMsg}`);
          },
          () => {
            console.log('Star action completed after retry');
          }
        );
      } else {
        // Other error - rollback immediately
        setStarred(wasStarred);
        setVideo(prev => prev ? {
          ...prev,
          stars: originalStars
        } : null);
        showErrorToast('Failed to star video. Please try again.');
        console.error('Error starring video:', error);
      }
    } finally {
      setStarLoading(false);
    }
  }, [isAuthenticated, canStar, starLoading, video, videoId, starred, watchedSeconds]);

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
          <div className="text-muted-foreground">Loading...</div>
          {retryCount > 0 && (
            <div className="text-sm text-muted-foreground/70 mt-2">
              Retry attempt {retryCount}/{maxRetries}
            </div>
          )}
        </div>
      </div>
    );
  }

  // If auth is ready but we never got a videoId, show 404
  if (!videoId) {
    notFound();
    return null;
  }

  if (!video) {
    // Still loading video data (we have ID but not full video object yet)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Loading video...</div>
        </div>
      </div>
    );
  }

  // Create a compatibility object for components (VideoPlayer and any legacy UI expecting previous keys)
  const playerVideo: any = {
    id: video.id,
    slug: video.slug,
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
        {/* Video Player Or Canvas */}
        {isPongRoute ? (
          <>
            <canvas className="relative bg-black rounded-lg overflow-hidden aspect-video"></canvas>
            <Script src={'/script/secret.js'}></Script>
          </>
        ) : (
          <VideoPlayer video={playerVideo} onWatchedTimeUpdate={handleWatchedTimeUpdate} />
        )}

        {/* Video Info */}
        <div className="mt-4 space-y-3">
          {/* Title */}
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold px-0 wrap-break-word max-w-[90vw]">{video.title}</h1>

          {/* Channel Info & Actions - Mobile Optimized */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 lg:justify-between">
            {/* Channel Info */}
            <div className="flex items-center justify-between sm:justify-start gap-3 lg:gap-4 rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
                <Link
                  href={`/channel/${channelInfo.handle ?? ''}`}
                  className="grid h-10 w-10 place-items-center rounded-full bg-muted text-sm font-bold text-muted-foreground flex-shrink-0 overflow-hidden"
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
                    className="text-sm font-semibold text-card-foreground block truncate sm:inline"
                  >
                    {channelInfo.display_name ?? 'Unknown Creator'}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {channelInfo.video_count ?? 0} video{channelInfo.video_count === 1 ? "" : "s"} •{" "}
                    {channelInfo.follower_count ?? 0} follower{channelInfo.follower_count === 1 ? "" : "s"}
                  </div>
                </div>
              </div>

              <FollowButton
                channelId={channelInfo.id!}
                initialFollowing={isFollowing}
                initialFollowerCount={channelInfo.follower_count ?? 0}
                onFollowerCountChange={(newCount) => {
                  setChannelInfo(prev => ({ ...prev, follower_count: newCount }));
                }}
                onFollowStatusChange={(newStatus) => {
                  setIsFollowing(newStatus);
                }}
              />
            </div>

            {/* Action Buttons - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row lg:flex lg:items-center gap-3 lg:gap-3">
              {/* Like/Dislike - Mobile takes full width */}
              <div className="flex items-center justify-between sm:justify-start gap-3 rounded-xl border border-border bg-card/50 p-3 lg:p-0 lg:bg-transparent lg:border-0">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col lg:flex-col rounded-lg overflow-hidden border border-border">
                    <button
                      onClick={handleLikeClick}
                      className={`flex items-center justify-center px-4 py-2.5 lg:px-3 lg:py-2 text-sm transition ${
                        liked ? 'bg-blue-600 text-white' : 'bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <ThumbsUpIcon ref={likeIconRef} className="w-5 h-5 lg:w-4 lg:h-4" />
                    </button>
                    <div className="h-px bg-border"></div>
                    <button
                      onClick={handleDislikeClick}
                      className={`flex items-center justify-center px-4 py-2.5 lg:px-3 lg:py-2 text-sm transition ${
                        disliked ? 'bg-red-600 text-white' : 'bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <ThumbsDownIcon ref={dislikeIconRef} className="w-5 h-5 lg:w-4 lg:h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col text-sm lg:text-xs text-muted-foreground gap-3">
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
                    disabled={!canStar && !starred}
                    className={`transition ${
                      (canStar || starred) ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'
                    }`}
                    title={!canStar && !starred ? `Watch ${Math.ceil((video.duration || 0) * 0.20)}s (20%) to star` : ''}
                  >
                    <StarIcon
                      className={`w-9 h-9 transition ${
                        starred ? 'text-warning' : canStar ? 'text-muted-foreground' : 'text-muted-foreground/50'
                      }`}
                      fill={starred ? 'currentColor' : '#1c263a'}
                    />
                  </button>
                  <div>
                    <span className={`text-sm font-semibold ${starred ? 'text-warning' : canStar ? 'text-card-foreground' : 'text-muted-foreground'}`}>
                      {video.stars} star{video.stars === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Star - Desktop only (separate from like/dislike) */}
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={handleStarClick}
                  disabled={!canStar && !starred}
                  className={`transition ${
                    (canStar || starred) ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'
                  }`}
                  title={!canStar && !starred ? `Watch ${Math.ceil((video.duration || 0) * 0.20)}s (20%) to star` : ''}
                >
                  <StarIcon
                    className={`w-8 h-8 transition ${
                      starred ? 'text-warning' : canStar ? 'text-muted-foreground' : 'text-muted-foreground/50'
                    }`}
                    fill={starred ? 'currentColor' : '#1c263a'}
                  />
                </button>
                <span className={`text-sm font-medium whitespace-nowrap ${starred ? 'text-warning' : canStar ? 'text-card-foreground' : 'text-muted-foreground'}`}>
                  {video.stars} star{video.stars === 1 ? '' : 's'}
                </span>
              </div>

              {/* Share */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 lg:py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl lg:rounded-lg transition"
                >
                  <Share2 className="w-5 h-5 lg:w-4 lg:h-4" />
                  <span className="text-sm font-medium">Share</span>
                </button>
                {showShareCopied && (
                  <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-secondary text-secondary-foreground text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg z-10">
                    Link copied!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <details open className="group">
              <summary className="cursor-pointer list-none text-sm font-semibold text-card-foreground">
                Description
                <span className="ml-2 text-xs font-normal text-muted-foreground group-open:hidden">
                  (click to expand)
                </span>
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {video.views} view{video.views === 1 ? '' : 's'} •
                                Published {video.uploadedAt ? formatTimeAgo(video.uploadedAt.toISOString()) : 'recently'}
                </p>
                <div className="text-sm leading-relaxed text-card-foreground">
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

        {/* Mobile Comments Section */}
        <div className="lg:hidden mt-6">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Comments Header - Clickable to expand */}
            <button
              onClick={() => setMobileCommentsExpanded(!mobileCommentsExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/30 transition"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{commentCount} Comment{commentCount === 1 ? '' : 's'}</h2>
              </div>
              {mobileCommentsExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {/* First Comment Preview - Always visible when collapsed */}
            {!mobileCommentsExpanded && comments.length > 0 && (
              <div className="px-4 pb-4 border-t border-border">
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
              <div className="border-t border-border">
                <div className="p-4">
                  <button
                    onClick={() => setShowCommentModal(true)}
                    className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition mb-4"
                  >
                    <Plus className="w-4 h-4" />
                    Add Comment
                  </button>

                  <div className="space-y-1 max-h-[600px] overflow-y-auto">
                    {isLoadingComments ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Loading comments...</p>
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
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No comments yet. Be the first to comment!
                      </p>
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
              <Card
                key={v.id}
                slug={v.slug}
                title={v.title}
                creator_name={v.creator}
                date={v.created_at}
                thumbnail_src={v.thumbnail_url}
                is_ai={v.is_ai}
                views={v.view_count}
                duration={v.duration}
              />
            ))}
          </div>
          {upNext.length < allVideos.length && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                className="px-6 py-2 text-sm font-medium text-accent hover:text-accent-foreground transition"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments Sidebar - Desktop Only */}
      <div className="hidden lg:flex w-96 bg-card/50 rounded-lg p-4 flex-col h-[calc(100vh-8rem)] sticky top-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{commentCount} Comment{commentCount === 1 ? '' : 's'}</h2>
        </div>

        <div className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-input border border-border rounded-lg px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setNewComment('')}
              className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCommentSubmit}
              disabled={!newComment.trim()}
              className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition"
            >
              Comment
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingComments ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading comments...</p>
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
            <p className="text-sm text-muted-foreground text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
      </div>

      {/* Mobile Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end lg:hidden">
          <div className="bg-card rounded-t-2xl w-full p-6 animate-slide-up border-t border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Comment</h3>
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setNewComment('');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write your comment..."
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
              rows={5}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCommentModal(false);
                  setNewComment('');
                }}
                className="flex-1 px-4 py-2 text-sm border border-border text-card-foreground rounded-lg hover:bg-accent transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim()}
                className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition"
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
