import { ChevronRight, ChevronDown, ThumbsUp, ThumbsDown, Edit2, Trash2 } from 'lucide-react';
import { CommentWithChildren } from "@/../types";
import { formatTimeAgo } from '@/../lib/utils';
import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { interactionQueue } from '@/../lib/interaction-queue';
import { showErrorToast } from '@/../lib/toast-manager';

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

  const data = await response.json();

  if (response.status === 429) {
    const error = new Error(data.message || 'Rate limited');
    (error as any).status = 429;
    throw error;
  }

  if (!response.ok) {
    throw new Error(data.message || 'Failed to like comment');
  }

  return data;
}

async function dislikeComment(videoId: string, commentId: string) {
  const response = await fetch(
    `/api/videos/${videoId}/comments/${commentId}/dislike`,
    { method: 'POST' }
  );

  const data = await response.json();

  if (response.status === 429) {
    const error = new Error(data.message || 'Rate limited');
    (error as any).status = 429;
    throw error;
  }

  if (!response.ok) {
    throw new Error(data.message || 'Failed to dislike comment');
  }

  return data;
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

export function Comment({
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
      showErrorToast(error.message || 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = useCallback(async () => {
    if (!currentUserId) {
      alert('Please sign in to like comments');
      return;
    }

    // Store original state
    const wasLiked = isLiked;
    const wasDisliked = isDisliked;
    const originalLikeCount = localLikeCount;
    const originalDislikeCount = localDislikeCount;

    // Optimistic update
    setIsLiked(true);
    if (wasDisliked) setIsDisliked(false);
    setLocalLikeCount(wasLiked ? originalLikeCount : originalLikeCount + 1);
    setLocalDislikeCount(wasDisliked ? originalDislikeCount - 1 : originalDislikeCount);

    const performLike = async () => {
      const result = await likeComment(videoId, comment.id);
      setLocalLikeCount(result.like_count);
      setLocalDislikeCount(result.dislike_count);
      setIsLiked(result.liked);
      if (result.liked) setIsDisliked(false);
    };

    try {
      await performLike();
    } catch (error: any) {
      if (error.status === 429) {
        // Rate limited - queue for retry
        interactionQueue.queueForRetry(
          'comment-like',
          comment.id,
          performLike,
          (errorMsg) => {
            // Rollback on final error
            setIsLiked(wasLiked);
            setIsDisliked(wasDisliked);
            setLocalLikeCount(originalLikeCount);
            setLocalDislikeCount(originalDislikeCount);
            showErrorToast(`Failed to like comment: ${errorMsg}`);
          }
        );
      } else {
        // Other error - rollback immediately
        setIsLiked(wasLiked);
        setIsDisliked(wasDisliked);
        setLocalLikeCount(originalLikeCount);
        setLocalDislikeCount(originalDislikeCount);
        showErrorToast('Failed to like comment');
        console.error('Error liking comment:', error);
      }
    }
  }, [isLiked, isDisliked, localLikeCount, localDislikeCount, currentUserId, videoId, comment.id]);

  const handleDislike = useCallback(async () => {
    if (!currentUserId) {
      alert('Please sign in to dislike comments');
      return;
    }

    // Store original state
    const wasDisliked = isDisliked;
    const wasLiked = isLiked;
    const originalLikeCount = localLikeCount;
    const originalDislikeCount = localDislikeCount;

    // Optimistic update
    setIsDisliked(true);
    if (wasLiked) setIsLiked(false);
    setLocalDislikeCount(wasDisliked ? originalDislikeCount : originalDislikeCount + 1);
    setLocalLikeCount(wasLiked ? originalLikeCount - 1 : originalLikeCount);

    const performDislike = async () => {
      const result = await dislikeComment(videoId, comment.id);
      setLocalLikeCount(result.like_count);
      setLocalDislikeCount(result.dislike_count);
      setIsDisliked(result.disliked);
      if (result.disliked) setIsLiked(false);
    };

    try {
      await performDislike();
    } catch (error: any) {
      if (error.status === 429) {
        // Rate limited - queue for retry
        interactionQueue.queueForRetry(
          'comment-dislike',
          comment.id,
          performDislike,
          (errorMsg) => {
            // Rollback on final error
            setIsDisliked(wasDisliked);
            setIsLiked(wasLiked);
            setLocalLikeCount(originalLikeCount);
            setLocalDislikeCount(originalDislikeCount);
            showErrorToast(`Failed to dislike comment: ${errorMsg}`);
          }
        );
      } else {
        // Other error - rollback immediately
        setIsDisliked(wasDisliked);
        setIsLiked(wasLiked);
        setLocalLikeCount(originalLikeCount);
        setLocalDislikeCount(originalDislikeCount);
        showErrorToast('Failed to dislike comment');
        console.error('Error disliking comment:', error);
      }
    }
  }, [isLiked, isDisliked, localLikeCount, localDislikeCount, currentUserId, videoId, comment.id]);

  const handleEdit = async () => {
    if (!editText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await editComment(videoId, comment.id, editText.trim());
      setIsEditing(false);
      onCommentUpdate?.();
    } catch (error: any) {
      showErrorToast(error.message || 'Failed to edit comment');
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
      showErrorToast(error.message || 'Failed to delete comment');
    }
  };

  if (isDeleted) {
    return null;
  }

  return (
    <div className={`${depth > 0 ? 'ml-4' : ''}`}>
      <div className="flex gap-3 py-2">
        <Link className="grid w-10 h-10 place-items-center rounded-full bg-muted text-sm font-bold text-foreground flex-shrink-0 overflow-hidden"
              href={`/user/${comment.user?.username}`}
        >
          {comment.user?.avatar_url ? (
            <Image
              src={comment.user?.avatar_url}
              alt={comment.user?.display_name ?? ""}
              className="h-full w-full object-cover"
              width={128}
              height={128}
            />
          ) : (
            comment.user?.display_name?.[0]?.toUpperCase() ?? "?"
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link className="text-sm font-medium text-foreground"
                  href={`/user/${comment.user?.username}`}
            >
              {displayName}
            </Link>
            <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.created_at)}</span>
          </div>

          {!collapsed && (
            <>
              {isEditing ? (
                <div className="mt-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditText(comment.message);
                      }}
                      className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleEdit}
                      disabled={!editText.trim() || isSubmitting}
                      className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition"
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-1 text-sm text-card-foreground break-words leading-relaxed">
                    {comment.message}
                  </div>

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-1 text-xs font-medium transition ${
                        isLiked ? 'text-blue-400' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {localLikeCount > 0 && <span>{localLikeCount}</span>}
                    </button>

                    <button
                      onClick={handleDislike}
                      className={`flex items-center gap-1 text-xs font-medium transition ${
                        isDisliked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      {localDislikeCount > 0 && <span>{localDislikeCount}</span>}
                    </button>

                    <button
                      onClick={() => setShowReplyBox(!showReplyBox)}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition"
                    >
                      Reply
                    </button>

                    {isOwner && (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>

                        <button
                          onClick={handleDelete}
                          className="text-xs font-medium text-muted-foreground hover:text-red-500 transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </>
                    )}

                    {hasReplies && (
                      <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                      >
                        {collapsed ? (
                          <>
                            <ChevronRight className="w-3 h-3" />
                            Show {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                          </>
                        ) : (
                          <>
                        <ChevronDown className="w-3 h-3" />
                            Hide {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {!collapsed && showReplyBox && (
                    <div className="mt-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring resize-none mb-2"
                rows={3}
                        autoFocus
                      />
              <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setShowReplyBox(false);
                            setReplyText('');
                          }}
                          className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleReplySubmit}
                          disabled={!replyText.trim() || isSubmitting}
                          className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition"
                        >
                          {isSubmitting ? 'Posting...' : 'Reply'}
                        </button>
                      </div>
                    </div>
                  )}

      {!collapsed && hasReplies && (
            <div className="mt-2">
              {comment.children?.map((reply) => (
            <Comment
                  key={reply.id}
                  comment={reply}
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
      </div>
    </div>
  );
}
