'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus, X, Share2, ChevronRight, ChevronDown, ThumbsUp, ThumbsDown, Edit2, Trash2 } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import { ThumbsUpIcon, ThumbsUpIconHandle } from "@/components/ThumbsUpIcon";
import { ThumbsDownIcon, ThumbsDownIconHandle } from "@/components/ThumbsDownIcon";
import { StarIcon } from "@/components/StarIcon";
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';

export type Video = {
  id: string;
  title: string;
  view_count: number;
  star_count: number;
  like_count: number;
  dislike_count: number;
  creator: string;
  creator_videos: number;
  creator_followers: number;
  creator_handle: string;
  description: string;
  thumbnail: string;
  src: string;
  duration?: number;
  created_at?: string;
  creator_avatar?: string | null;
};

type Comment = {
  id: string;
  user_id: string;
  video_id: string;
  message: string;
  like_count: number;
  dislike_count: number;
  created_at: string;
  parent_comment_id?: string;
  user?: {
    id: string;
    username: string;
    display_name?: string;
  };
};

type CommentWithChildren = Comment & { children?: CommentWithChildren[] };

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

async function postReply(videoId: string, commentId: string, message: string) {
  const response = await fetch(
    `/api/videos/${videoId}/comments/${commentId}/reply`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to post reply');
  }
  return response.json();
}

async function likeComment(videoId: string, commentId: string) {
  const response = await fetch(
    `/api/videos/${videoId}/comments/${commentId}/like`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to like comment');
  }
  return response.json();
}

async function dislikeComment(videoId: string, commentId: string) {
  const response = await fetch(
    `/api/videos/${videoId}/comments/${commentId}/dislike`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to dislike comment');
  }
  return response.json();
}

async function editComment(videoId: string, commentId: string, message: string) {
  const response = await fetch(
    `/api/videos/${videoId}/comments/${commentId}/edit`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to edit comment');
  }
  return response.json();
}

async function deleteComment(videoId: string, commentId: string) {
  const response = await fetch(
    `/api/videos/${videoId}/comments/${commentId}/delete`,
    { method: 'DELETE' }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete comment');
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

function formatTimeAgo(timestamp: string): string {
  try {
    const now = new Date();
    const created = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
  } catch {
    return timestamp;
  }
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

function CommentComponent({
  comment,
  videoId,
  currentUserId,
  userLikedComments,
  userDislikedComments,
  depth = 0,
  onReplySubmit,
  onCommentUpdate
}: {
  comment: CommentWithChildren;
  videoId: string;
  currentUserId?: string;
  userLikedComments: string[];
  userDislikedComments: string[];
  depth?: number;
  onReplySubmit?: () => void;
  onCommentUpdate?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.message);
  const [localLikeCount, setLocalLikeCount] = useState(comment.like_count);
  const [localDislikeCount, setLocalDislikeCount] = useState(comment.dislike_count);
  const [isLiked, setIsLiked] = useState(userLikedComments.includes(comment.id));
  const [isDisliked, setIsDisliked] = useState(userDislikedComments.includes(comment.id));
  const [isDeleted, setIsDeleted] = useState(false);

  const hasReplies = comment.children && comment.children.length > 0;
  const replyCount = comment.children?.length || 0;
  const displayName = comment.user?.display_name || comment.user?.username || 'Unknown User';
  const isOwner = currentUserId === comment.user_id;

  const handleReplySubmit = async () => {
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await postReply(videoId, comment.id, replyText.trim());
      setReplyText('');
      setShowReplyBox(false);
      onReplySubmit?.();
    } catch (error: any) {
      alert(error.message || 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async () => {
    try {
      const result = await likeComment(videoId, comment.id);
      setLocalLikeCount(result.like_count);
      setLocalDislikeCount(result.dislike_count);
      setIsLiked(result.liked);
      if (result.liked) setIsDisliked(false);
    } catch (error: any) {
      if (error.message.includes('wait')) {
        alert(error.message);
      } else if (error.message.includes('sign in')) {
        alert('Please sign in to like comments');
      } else {
        console.error('Error liking comment:', error);
      }
    }
  };

  const handleDislike = async () => {
    try {
      const result = await dislikeComment(videoId, comment.id);
      setLocalLikeCount(result.like_count);
      setLocalDislikeCount(result.dislike_count);
      setIsDisliked(result.disliked);
      if (result.disliked) setIsLiked(false);
    } catch (error: any) {
      if (error.message.includes('wait')) {
        alert(error.message);
      } else if (error.message.includes('sign in')) {
        alert('Please sign in to dislike comments');
      } else {
        console.error('Error disliking comment:', error);
      }
    }
  };

  const handleEdit = async () => {
    if (!editText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await editComment(videoId, comment.id, editText.trim());
      setIsEditing(false);
      onCommentUpdate?.();
    } catch (error: any) {
      alert(error.message || 'Failed to edit comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(videoId, comment.id);
      setIsDeleted(true);
      onCommentUpdate?.();
    } catch (error: any) {
      alert(error.message || 'Failed to delete comment');
    }
  };

  if (isDeleted) {
    return null;
  }

  return (
    <div className={`${depth > 0 ? 'ml-4' : ''}`}>
      <div className="flex gap-3 py-2">
        <Link className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
              href={`/user/${comment.user?.username}`}
        >
          {displayName[0]?.toUpperCase() ?? '?'}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-200">{displayName}</span>
            <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
          </div>

          {!collapsed && (
            <>
              {isEditing ? (
                <div className="mt-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditText(comment.message);
                      }}
                      className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEdit}
                      disabled={!editText.trim() || isSubmitting}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition"
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-1 text-sm text-gray-300 break-words leading-relaxed">
                    {comment.message}
                  </div>

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-1 text-xs font-medium transition ${
                        isLiked ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {localLikeCount > 0 && <span>{localLikeCount}</span>}
                    </button>

                    <button
                      onClick={handleDislike}
                      className={`flex items-center gap-1 text-xs font-medium transition ${
                        isDisliked ? 'text-red-400' : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      {localDislikeCount > 0 && <span>{localDislikeCount}</span>}
                    </button>

                    <button
                      onClick={() => setShowReplyBox(!showReplyBox)}
                      className="text-xs font-medium text-gray-400 hover:text-white transition"
                    >
                      Reply
                    </button>

                    {isOwner && (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-white transition"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </>
                    )}

                    {hasReplies && (
                      <button
                        onClick={() => setCollapsed(true)}
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 transition flex items-center gap-1 ml-1"
                      >
                        <ChevronDown className="w-3 h-3" />
                        {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                      </button>
                    )}
                  </div>

                  {showReplyBox && (
                    <div className="mt-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Add a reply..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600 resize-none"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => {
                            setShowReplyBox(false);
                            setReplyText('');
                          }}
                          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleReplySubmit}
                          disabled={!replyText.trim() || isSubmitting}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition"
                        >
                          {isSubmitting ? 'Posting...' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="mt-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
            >
              <ChevronRight className="w-3 h-3" />
              Show {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {!collapsed && hasReplies && (
        <div className="mt-2 border-l-2 border-gray-800 pl-2">
          {comment.children!.map((child) => (
            <CommentComponent
              key={child.id}
              comment={child}
              videoId={videoId}
              currentUserId={currentUserId}
              userLikedComments={userLikedComments}
              userDislikedComments={userDislikedComments}
              depth={depth + 1}
              onReplySubmit={onReplySubmit}
              onCommentUpdate={onCommentUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WatchPageClient({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const [video, setVideo] = useState<Video | null>(null);
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

  useEffect(() => {
    async function loadData() {
      const resolvedParams = await Promise.resolve(params);
      const { id } = resolvedParams;

      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setIsAuthenticated(true);
          setCurrentUserId(user.id);

          const { data: userData } = await supabase
            .from('users')
            .select('liked_videos, disliked_videos, starred_videos')
            .eq('id', user.id)
            .single();

          if (userData) {
            setLiked(userData.liked_videos?.includes(id) || false);
            setDisliked(userData.disliked_videos?.includes(id) || false);
            setStarred(userData.starred_videos?.includes(id) || false);
          }
        }

        const videoRes = await fetch(`/api/videos/${id}`);
        if (!videoRes.ok) {
          notFound();
          return;
        }
        const videoData = await videoRes.json();

        const videoObj = {
          ...videoData,
          src: videoData.video_url,
          creator: videoData.channels?.display_name || "Unknown Creator",
          creator_videos: videoData.channels?.video_count ?? 0,
          creator_followers: videoData.channels?.follower_count ?? 0,
          creator_handle: videoData.channels?.handle ?? "",
          duration: videoData.duration,
          created_at: videoData.created_at,
          creator_avatar: videoData.channels?.avatar_url ?? null,
        };

        setVideo(videoObj);
        document.title = `${videoObj.title} - Stellicast`;

        if (shouldCountView(id)) {
          fetch(`/api/videos/${id}/view`, { method: 'POST' })
            .then(async res => {
              const data = await res.json();
              if (res.status === 429) {
                console.log('View rate limited:', data.message);
                return;
              }
              if (data.success && data.view_count) {
                setVideo(prev => prev ? { ...prev, view_count: data.view_count } : null);
              }
            })
            .catch(error => console.error('Error incrementing view:', error));
        }

        const allRes = await fetch(`/api/videos`);
        if (allRes.ok) {
          const allData = await allRes.json();
          const videos = Array.isArray(allData.videos) ? allData.videos : [];
          const filteredVideos = videos.filter((v: any) => v.id !== id);
          setAllVideos(filteredVideos);
          setUpNext(filteredVideos.slice(0, 6));
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
        like_count: data.like_count,
        dislike_count: data.dislike_count
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
        like_count: data.like_count,
        dislike_count: data.dislike_count
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
        star_count: data.star_count
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
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1800px] mx-auto px-4">
      <div className="flex-1 min-w-0">
        <VideoPlayer video={video} onWatchedTimeUpdate={handleWatchedTimeUpdate} />

        <div className="mt-4 space-y-3">
          <h1 className="text-xl sm:text-2xl font-semibold">{video.title}</h1>

          <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
            <div className="flex items-center justify-between sm:justify-start gap-4 rounded-2xl border border-gray-800 bg-[#0a0a0a] p-3">
              <div className="flex items-center gap-3">
                <a
                  className="grid h-10 w-10 place-items-center rounded-full bg-zinc-600 text-sm font-bold text-white flex-shrink-0 overflow-hidden"
                  href={`/channel/${video.creator_handle}`}
                >
                  {video.creator_avatar ? (
                    <img
                      src={video.creator_avatar}
                      alt={video.creator}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    video.creator?.[0]?.toUpperCase() ?? "C"
                  )}
                </a>
                <div>
                  <a
                    className="text-sm font-semibold text-gray-100"
                    href={`/channel/${video.creator_handle}`}
                  >
                    {video.creator}
                  </a>
                  <div className="text-xs text-gray-400">
                    {video.creator_videos} video
                    {video.creator_videos === 1 ? "" : "s"} •{" "}
                    {video.creator_followers} follower
                    {video.creator_followers === 1 ? "" : "s"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="rounded-full bg-blue-600 px-5 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
              >
                Follow
              </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex flex-col rounded-lg overflow-hidden border border-gray-800">
                  <button
                    onClick={handleLikeClick}
                    disabled={likeLoading}
                    className={`flex items-center justify-center px-3 py-2 text-sm transition ${
                      liked ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                    } ${likeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ThumbsUpIcon ref={likeIconRef} className="w-4 h-4" />
                  </button>
                  <div className="h-px bg-gray-800"></div>
                  <button
                    onClick={handleDislikeClick}
                    disabled={dislikeLoading}
                    className={`flex items-center justify-center px-3 py-2 text-sm transition ${
                      disliked ? 'bg-red-600 text-white' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                    } ${dislikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ThumbsDownIcon ref={dislikeIconRef} className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-col text-xs text-gray-400 gap-3">
                  <span>{video.like_count} like{video.like_count === 1 ? '' : 's'}</span>
                  <span>{video.dislike_count} dislike{video.dislike_count === 1 ? '' : 's'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                <span className={`text-sm font-medium ${starred ? 'text-yellow-500' : canStar ? 'text-gray-300' : 'text-gray-600'}`}>
                  {video.star_count} star{video.star_count === 1 ? '' : 's'}
                </span>
              </div>

              <div className="relative">
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Share</span>
                </button>
                {showShareCopied && (
                  <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    Link copied!
                  </div>
                )}
              </div>
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
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-400">
                  {video.view_count} view{video.view_count === 1 ? '' : 's'} • Published {video.created_at ? formatTimeAgo(video.created_at) : 'recently'}
                </p>
                <div className="text-sm leading-relaxed text-gray-300">
                  {video.description.split('\n').map((line, i) => (
                    <p key={i} className={i === 0 ? '' : 'mt-3'}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">More Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upNext.map((v: any) => (
              <Link key={v.id} href={`/watch/${v.id}`} className="bg-gray-900/50 rounded-lg overflow-hidden hover:bg-gray-900 transition">
                <div className="aspect-video bg-gray-800 relative">
                  <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium line-clamp-2">{v.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{v.channels?.display_name || 'Unknown'} • {v.view_count} view{v.view_count === 1 ? '' : 's'}</p>
                </div>
              </Link>
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

      <div className="w-full lg:w-96 bg-gray-900/50 rounded-lg p-4 flex flex-col lg:h-[calc(100vh-8rem)] lg:sticky lg:top-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">{commentCount} Comment{commentCount === 1 ? '' : 's'}</h2>
        </div>

        <div className="hidden lg:block mb-4">
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

        <button
          onClick={() => setShowCommentModal(true)}
          className="lg:hidden flex items-center justify-center gap-2 w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-500 transition mb-4"
        >
          <Plus className="w-4 h-4" />
          Add Comment
        </button>

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
