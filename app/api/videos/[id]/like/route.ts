import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/../lib/supabase-server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Cooldown period in milliseconds (1 second to prevent spam)
const LIKE_COOLDOWN_MS = 1000;

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: videoId } = await context.params;

    // Use standard client to get user (respects session)
    const supabase = await createSupabaseServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client for all database operations (bypasses RLS)
    const adminClient = createSupabaseAdminClient();

    // Check if video exists
    const { data: video, error: videoError } = await adminClient
      .from('videos')
      .select('id, like_count, dislike_count')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check rate limit
    const { data: rateLimitData } = await adminClient
      .from('engagement_rate_limits')
      .select('last_action_at')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .eq('action_type', 'like')
      .single();

    if (rateLimitData) {
      const lastActionTime = new Date(rateLimitData.last_action_at).getTime();
      const now = Date.now();
      const timeSinceLastAction = now - lastActionTime;

      if (timeSinceLastAction < LIKE_COOLDOWN_MS) {
        const remainingMs = LIKE_COOLDOWN_MS - timeSinceLastAction;

        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `Please wait ${Math.ceil(remainingMs / 1000)} second${Math.ceil(remainingMs / 1000) === 1 ? '' : 's'} before liking/unliking again`,
            remainingMs
          },
          { status: 429 }
        );
      }
    }

    // Get user's current liked and disliked videos
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('liked_videos, disliked_videos')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    const likedVideos = userData.liked_videos || [];
    const dislikedVideos = userData.disliked_videos || [];
    const hasLiked = likedVideos.includes(videoId);
    const hasDisliked = dislikedVideos.includes(videoId);

    let newLikeCount = video.like_count;
    let newDislikeCount = video.dislike_count;
    let updatedLikedVideos: string[];
    let updatedDislikedVideos: string[] = dislikedVideos;
    let action: 'liked' | 'unliked';

    if (hasLiked) {
      // User already liked - remove like
      newLikeCount = Math.max(0, video.like_count - 1);
      updatedLikedVideos = likedVideos.filter((id: string) => id !== videoId);
      action = 'unliked';
    } else {
      // User hasn't liked - add like
      newLikeCount = video.like_count + 1;
      updatedLikedVideos = [...likedVideos, videoId];
      action = 'liked';

      // If user had disliked the video, remove the dislike
      if (hasDisliked) {
        newDislikeCount = Math.max(0, video.dislike_count - 1);
        updatedDislikedVideos = dislikedVideos.filter((id: string) => id !== videoId);
      }
    }

    // Update video counts
    const { error: updateVideoError } = await adminClient
      .from('videos')
      .update({
        like_count: newLikeCount,
        dislike_count: newDislikeCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId);

    if (updateVideoError) {
      console.error('Error updating video:', updateVideoError);
      return NextResponse.json(
        { error: 'Failed to update video' },
        { status: 500 }
      );
    }

    // Update user's liked/disliked videos
    const { error: updateUserError } = await adminClient
      .from('users')
      .update({
        liked_videos: updatedLikedVideos,
        disliked_videos: updatedDislikedVideos,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateUserError) {
      console.error('Error updating user:', updateUserError);
      return NextResponse.json(
        { error: 'Failed to update user preferences' },
        { status: 500 }
      );
    }

    // Update rate limit
    const { error: rateLimitError } = await adminClient
      .from('engagement_rate_limits')
      .upsert(
        {
          user_id: user.id,
          video_id: videoId,
          action_type: 'like',
          last_action_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,video_id,action_type'
        }
      );

    if (rateLimitError) {
      console.error('Error updating rate limit:', rateLimitError);
      // Continue anyway - rate limiting is not critical
    }

    return NextResponse.json({
      success: true,
      action,
      like_count: newLikeCount,
      dislike_count: newDislikeCount,
      liked: action === 'liked'
    });

  } catch (error) {
    console.error('Error handling like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
