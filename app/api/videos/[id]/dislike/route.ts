import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Cooldown period in milliseconds (3 seconds to prevent spam)
const DISLIKE_COOLDOWN_MS = 3 * 1000;

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: videoId } = await context.params;
    const supabase = await createSupabaseServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if video exists
    const { data: video, error: videoError } = await supabase
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
    const { data: rateLimitData } = await supabase
      .from('engagement_rate_limits')
      .select('last_action_at')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .eq('action_type', 'dislike')
      .single();

    if (rateLimitData) {
      const lastActionTime = new Date(rateLimitData.last_action_at).getTime();
      const now = Date.now();
      const timeSinceLastAction = now - lastActionTime;

      if (timeSinceLastAction < DISLIKE_COOLDOWN_MS) {
        const remainingMs = DISLIKE_COOLDOWN_MS - timeSinceLastAction;

        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `Please wait ${Math.ceil(remainingMs / 1000)} second${Math.ceil(remainingMs / 1000) === 1 ? '' : 's'} before disliking/removing dislike again`,
            remainingMs
          },
          { status: 429 }
        );
      }
    }

    // Get user's current liked and disliked videos
    const { data: userData, error: userError } = await supabase
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
    let updatedLikedVideos: string[] = likedVideos;
    let updatedDislikedVideos: string[];
    let action: 'disliked' | 'removed_dislike';

    if (hasDisliked) {
      // User already disliked - remove dislike
      newDislikeCount = Math.max(0, video.dislike_count - 1);
      updatedDislikedVideos = dislikedVideos.filter((id: string) => id !== videoId);
      action = 'removed_dislike';
    } else {
      // User hasn't disliked - add dislike
      newDislikeCount = video.dislike_count + 1;
      updatedDislikedVideos = [...dislikedVideos, videoId];
      action = 'disliked';

      // If user had liked the video, remove the like
      if (hasLiked) {
        newLikeCount = Math.max(0, video.like_count - 1);
        updatedLikedVideos = likedVideos.filter((id: string) => id !== videoId);
      }
    }

    // Update video counts
    const { error: updateVideoError } = await supabase
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
    const { error: updateUserError } = await supabase
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
    const { error: rateLimitError } = await supabase
      .from('engagement_rate_limits')
      .upsert(
        {
          user_id: user.id,
          video_id: videoId,
          action_type: 'dislike',
          last_action_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,video_id,action_type'
        }
      );

    if (rateLimitError) {
      console.error('Error updating rate limit:', rateLimitError);
    }

    return NextResponse.json({
      success: true,
      action,
      like_count: newLikeCount,
      dislike_count: newDislikeCount,
      disliked: action === 'disliked'
    });

  } catch (error) {
    console.error('Error handling dislike:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
