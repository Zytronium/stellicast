// get all comments under this video
// route: /api/videos/:id/comments
// method: GET
// params: sort order, page number, search query
// auth: none
// response: a section of the comments after applying sort order and search query, or error

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: videoId } = await context.params;
    const searchParams = request.nextUrl.searchParams;

    const sortOrder = searchParams.get('sort') || 'newest'; // newest, oldest, popular
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const searchQuery = searchParams.get('search') || '';

    const supabase = await createSupabaseServerClient();

    const commentSelect = `
      *,
      user:users!comments_user_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `;

    // Search results include the complete conversation around every match:
    // ancestors are included so replies have context, and descendants are
    // included so a matching comment still shows its entire thread.
    let comments;
    let count;
    let error;

    if (searchQuery) {
      const { data: matchingComments, error: matchingError, count: matchingCount } =
        await supabase
          .from('comments')
          .select(commentSelect, { count: 'exact' })
          .eq('video_id', videoId)
          .eq('visible', true)
          .ilike('message', `%${searchQuery}%`);

      if (matchingError) {
        error = matchingError;
      } else {
        let allCommentsQuery = supabase
          .from('comments')
          .select(commentSelect)
          .eq('video_id', videoId)
          .eq('visible', true);

        switch (sortOrder) {
          case 'oldest':
            allCommentsQuery = allCommentsQuery.order('created_at', { ascending: true });
            break;
          case 'popular':
            allCommentsQuery = allCommentsQuery.order('like_count', { ascending: false });
            break;
          case 'newest':
          default:
            allCommentsQuery = allCommentsQuery.order('created_at', { ascending: false });
            break;
        }

        const { data: allComments, error: allCommentsError } = await allCommentsQuery;

        if (allCommentsError) {
          error = allCommentsError;
        } else {
          const relevantIds = new Set((matchingComments || []).map((comment) => comment.id));
          let changed = true;

          // Add parents first, then repeatedly add replies to any relevant
          // comment so nested threads are complete in either direction.
          while (changed) {
            changed = false;
            for (const comment of allComments || []) {
              if (comment.parent_comment_id && relevantIds.has(comment.id) && !relevantIds.has(comment.parent_comment_id)) {
                relevantIds.add(comment.parent_comment_id);
                changed = true;
              }
              if (comment.parent_comment_id && relevantIds.has(comment.parent_comment_id) && !relevantIds.has(comment.id)) {
                relevantIds.add(comment.id);
                changed = true;
              }
            }
          }

          comments = (allComments || []).filter((comment) => relevantIds.has(comment.id));
          count = matchingCount;
        }
      }
    } else {
      let query = supabase
        .from('comments')
        .select(commentSelect, { count: 'exact' })
        .eq('video_id', videoId)
        .eq('visible', true);

      switch (sortOrder) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'popular':
          query = query.order('like_count', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const result = await query.range(from, to);
      comments = result.data;
      error = result.error;
      count = result.count;
    }

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    // -------------------------
    // Hydrate user engagement from new tables
    // -------------------------
    let likedComments: string[] = [];
    let dislikedComments: string[] = [];

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const [likedResult, dislikedResult] = await Promise.all([
        supabase
          .from('comment_likes')
          .select(`comment_id, comments!inner(video_id)`)
          .eq('user_id', user.id)
          .eq('comments.video_id', videoId),

        supabase
          .from('comment_dislikes')
          .select(`comment_id, comments!inner(video_id)`)
          .eq('user_id', user.id)
          .eq('comments.video_id', videoId)
      ]);

      if (likedResult.error) {
        console.error('Error fetching comment likes:', likedResult.error);
      }

      if (dislikedResult.error) {
        console.error('Error fetching comment dislikes:', dislikedResult.error);
      }

      likedComments =
        likedResult.data?.map((r) => r.comment_id) ?? [];

      dislikedComments =
        dislikedResult.data?.map((r) => r.comment_id) ?? [];
    }

    // -------------------------
    // Response
    // -------------------------
    return NextResponse.json({
      success: true,
      comments: comments || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
      userEngagement: {
        likedComments,
        dislikedComments,
      },
    });

  } catch (error) {
    console.error('Error handling comments request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
