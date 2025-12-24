import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Cooldown period in milliseconds (5 seconds for stars)
const STAR_COOLDOWN_MS = 5000;

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: videoId } = await context.params;
    const body = await request.json();
    const { watchedSeconds } = body;

    const supabase = await createSupabaseServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if video exists and get duration
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, star_count, duration')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Verify user has watched at least 20% of the video
    const requiredWatchTime = (video.duration || 0) * 0.20;
    if (watchedSeconds < requiredWatchTime && watchedSeconds < 15 * 60 * 1000) {
      return NextResponse.json(
        {
          error: 'Insufficient watch time',
          message: `You must watch at least 20% of the video (${Math.ceil(requiredWatchTime)} seconds) or 15 minutes (whichever is shorter) to star it`,
          requiredSeconds: Math.ceil(requiredWatchTime),
          watchedSeconds
        },
        { status: 403 }
      );
    }

    // Check rate limit
    const { data: rateLimitData } = await supabase
      .from('engagement_rate_limits')
      .select('last_action_at')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .eq('action_type', 'star')
      .single();

    if (rateLimitData) {
      const lastActionTime = new Date(rateLimitData.last_action_at).getTime();
      const now = Date.now();
      const timeSinceLastAction = now - lastActionTime;

      if (timeSinceLastAction < STAR_COOLDOWN_MS) {
        const remainingMs = STAR_COOLDOWN_MS - timeSinceLastAction;

        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `Please wait ${Math.ceil(remainingMs / 1000)} second${Math.ceil(remainingMs / 1000) === 1 ? '' : 's'} before starring/unstarring again`,
            remainingMs
          },
          { status: 429 }
        );
      }
    }

    // Get user's current starred videos
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('starred_videos')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    const starredVideos = userData.starred_videos || [];
    const hasStarred = starredVideos.includes(videoId);

    let newStarCount;
    let updatedStarredVideos: string[];
    let action: 'starred' | 'unstarred';

    if (hasStarred) {
      // User already starred - remove star
      newStarCount = Math.max(0, video.star_count - 1);
      updatedStarredVideos = starredVideos.filter((id: string) => id !== videoId);
      action = 'unstarred';
    } else {
      // User hasn't starred - add star
      newStarCount = video.star_count + 1;
      updatedStarredVideos = [...starredVideos, videoId];
      action = 'starred';
    }

    // Update video star count
    const { error: updateVideoError } = await supabase
      .from('videos')
      .update({
        star_count: newStarCount,
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

    // Update user's starred videos
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        starred_videos: updatedStarredVideos,
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
          action_type: 'star',
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
      star_count: newStarCount,
      starred: action === 'starred'
    });

  } catch (error) {
    console.error('Error handling star:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
