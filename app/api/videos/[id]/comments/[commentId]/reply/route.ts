// post a new reply to a comment, posting under logged-in user's name
// route: /api/videos/:id/comments/:id/reply
// method: POST
// params: comment content
// auth: requre user to be signed in.
// response: comment ID or error
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

type RouteContext = {
  params: Promise<{ id: string; commentId: string }>;
};

const COMMENT_COOLDOWN_MS = 5000; // 5 seconds between comments

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: videoId, commentId } = await context.params;
    const { message } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().replaceAll('‎', '').replaceAll('‏', '').length === 0) { // note: LRM and RLM on this line may mess with the direction of text flow depending on your text editor
      return NextResponse.json(
        { error: 'Reply message is required' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Reply must be 5000 characters or less' },
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

    // Get parent comment to verify it exists and get video_id
    const { data: parentComment, error: parentError } = await supabase
      .from('comments')
      .select('id, video_id, visible')
      .eq('id', commentId)
      .single();

    if (parentError || !parentComment) {
      return NextResponse.json(
        { error: 'Parent comment not found' },
        { status: 404 }
      );
    }

    if (!parentComment.visible) {
      return NextResponse.json(
        { error: 'Cannot reply to hidden comment' },
        { status: 400 }
      );
    }

    // Check rate limit (using video_id for rate limiting)
    const { data: rateLimitData } = await supabase
      .from('engagement_rate_limits')
      .select('last_action_at')
      .eq('user_id', user.id)
      .eq('video_id', parentComment.video_id)
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
            message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds before replying again`,
            remainingMs
          },
          { status: 429 }
        );
      }
    }

    // Create reply
    const { data: reply, error: replyError } = await supabase
      .from('comments')
      .insert({
        video_id: parentComment.video_id,
        user_id: user.id,
        parent_comment_id: commentId,
        message: message.trim()
      })
      .select('*')
      .single();

    if (replyError) {
      console.error('Error creating reply:', replyError);
      return NextResponse.json(
        { error: 'Failed to create reply' },
        { status: 500 }
      );
    }

    // Update rate limit
    await supabase
      .from('engagement_rate_limits')
      .upsert(
        {
          user_id: user.id,
          video_id: parentComment.video_id,
          action_type: 'comment',
          last_action_at: new Date().toISOString()
        },
        { onConflict: 'user_id,video_id,action_type' }
      );

    return NextResponse.json({
      success: true,
      reply
    });

  } catch (error) {
    console.error('Error handling reply:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
