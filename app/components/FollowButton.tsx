'use client';

import { useState, useEffect } from 'react';

interface FollowButtonProps {
  channelId: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
  onFollowerCountChange?: (newCount: number) => void;
  onFollowStatusChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({
  channelId,
  initialFollowing,
  initialFollowerCount,
  onFollowerCountChange,
  onFollowStatusChange,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  // Sync with prop changes (for when parent fetches follow status after mount)
  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  useEffect(() => {
    setFollowerCount(initialFollowerCount);
  }, [initialFollowerCount]);

  const handleFollowClick = async () => {
    setIsFollowLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const response = await fetch(`/api/follow?channelId=${channelId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to unfollow');
        }

        setIsFollowing(false);
        const newCount = Math.max(followerCount - 1, 0);
        setFollowerCount(newCount);
        onFollowerCountChange?.(newCount);
        onFollowStatusChange?.(false);
      } else {
        // Follow
        const response = await fetch('/api/follow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channelId,
            notify: 'none',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to follow');
        }

        setIsFollowing(true);
        const newCount = followerCount + 1;
        setFollowerCount(newCount);
        onFollowerCountChange?.(newCount);
        onFollowStatusChange?.(true);
      }
    } catch (error) {
      console.error('Follow error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsFollowLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleFollowClick}
      disabled={isFollowLoading}
      className={`
        h-9 sm:h-10
        px-6
        w-full sm:w-auto
        rounded-full
        text-sm font-semibold
        transition
        self-center
        cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
        isFollowing
          ? 'bg-muted text-foreground hover:bg-muted/80'
          : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30'
      }
      `}
    >
      {isFollowLoading ? (isFollowing ? 'Unfollowing...' : 'Following...') : (isFollowing ? 'Unfollow' : 'Follow')}
    </button>
  );
}