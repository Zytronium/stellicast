import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

type RouteContext = {
  params: Promise<{ id: string; commentId: string }>;
};

const LIKE_COOLDOWN_MS = 3 * 1000; // 3 seconds

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { commentId } = await context.params;
    const supabase = await createSupabaseServerClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if comment exists
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, like_count, dislike_count, visible')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (!comment.visible) {
      return NextResponse.json(
        { error: 'Comment not available' },
        { status: 404 }
      );
    }

    // Check rate limit
    const { data: rateLimitData } = await supabase
      .from('comment_engagement_rate_limits')
      .select('last_action_at')
      .eq('user_id', user.id)
      .eq('comment_id', commentId)
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

    // Get user's current engagement
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('liked_comments, disliked_comments')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    const likedComments = userData.liked_comments || [];
    const dislikedComments = userData.disliked_comments || [];
    const hasLiked = likedComments.includes(commentId);
    const hasDisliked = dislikedComments.includes(commentId);

    let newLikeCount = comment.like_count;
    let newDislikeCount = comment.dislike_count;
    let updatedLikedComments: string[];
    let updatedDislikedComments: string[] = dislikedComments;
    let action: 'liked' | 'unliked';

    if (hasLiked) {
      // Remove like
      newLikeCount = Math.max(0, comment.like_count - 1);
      updatedLikedComments = likedComments.filter((id: string) => id !== commentId);
      action = 'unliked';
    } else {
      // Add like
      newLikeCount = comment.like_count + 1;
      updatedLikedComments = [...likedComments, commentId];
      action = 'liked';

      // Remove dislike if present
      if (hasDisliked) {
        newDislikeCount = Math.max(0, comment.dislike_count - 1);
        updatedDislikedComments = dislikedComments.filter((id: string) => id !== commentId);
      }
    }

    // Update comment counts
    const { error: updateCommentError } = await supabase
      .from('comments')
      .update({
        like_count: newLikeCount,
        dislike_count: newDislikeCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (updateCommentError) {
      console.error('Error updating comment:', updateCommentError);
      return NextResponse.json(
        { error: 'Failed to update comment' },
        { status: 500 }
      );
    }

    // Update user's engagement
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        liked_comments: updatedLikedComments,
        disliked_comments: updatedDislikedComments,
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
    await supabase
      .from('comment_engagement_rate_limits')
      .upsert(
        {
          user_id: user.id,
          comment_id: commentId,
          action_type: 'like',
          last_action_at: new Date().toISOString()
        },
        { onConflict: 'user_id,comment_id,action_type' }
      );

    return NextResponse.json({
      success: true,
      action,
      like_count: newLikeCount,
      dislike_count: newDislikeCount,
      liked: action === 'liked'
    });

  } catch (error) {
    console.error('Error handling comment like:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
