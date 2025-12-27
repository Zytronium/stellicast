// post a new comment under logged-in user's name
// route: /api/videos/:id/comment
// method: POST
// params: comment content
// auth: requre user to be signed in.
// response: comment ID or error
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const COMMENT_COOLDOWN_MS = 5000; // 5 seconds between comments

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: videoId } = await context.params;
    const { message } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().replaceAll('‎', '').replaceAll('‏', '').length === 0) { // note: LRM and RLM on this line may mess with the direction of text flow depending on your text editor
      return NextResponse.json(
        { error: 'Comment message is required' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Comment must be 5000 characters or less' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify video exists
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id')
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
      .eq('action_type', 'comment')
      .single();

    if (rateLimitData) {
      const lastActionTime = new Date(rateLimitData.last_action_at).getTime();
      const now = Date.now();
      const timeSinceLastAction = now - lastActionTime;

      if (timeSinceLastAction < COMMENT_COOLDOWN_MS) {
        const remainingMs = COMMENT_COOLDOWN_MS - timeSinceLastAction;
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds before commenting again`,
            remainingMs
          },
          { status: 429 }
        );
      }
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        video_id: videoId,
        user_id: user.id,
        message: message.trim()
      })
      .select('*')
      .single();

    if (commentError) {
      console.error('Error creating comment:', commentError);
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      );
    }

    // Update rate limit
    await supabase
      .from('engagement_rate_limits')
      .upsert(
        {
          user_id: user.id,
          video_id: videoId,
          action_type: 'comment',
          last_action_at: new Date().toISOString()
        },
        { onConflict: 'user_id,video_id,action_type' }
      );

    return NextResponse.json({
      success: true,
      comment
    });

  } catch (error) {
    console.error('Error handling comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}