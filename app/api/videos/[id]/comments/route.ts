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

    // -------------------------
    // Fetch comments
    // -------------------------
    let query = supabase
      .from('comments')
      .select(
        `
        *,
        user:users!comments_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `,
        { count: 'exact' }
      )
      .eq('video_id', videoId)
      .eq('visible', true);

    // Apply search filter
    if (searchQuery) {
      query = query.ilike('message', `%${searchQuery}%`);
    }

    // Apply sorting
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

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: comments, error, count } = await query;

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
