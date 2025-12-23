import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Cooldown period in milliseconds (30 minutes)
const VIEW_COOLDOWN_MS = 30 * 60 * 1000;

function getClientIp(request: NextRequest): string {
  // Try various headers in order of preference
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to a default (shouldn't happen in production)
  return 'unknown';
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const clientIp = getClientIp(request);

    if (clientIp === 'unknown') {
      console.error('Unable to determine client IP');
      return NextResponse.json(
        { error: 'Unable to process request' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Check if video exists
    const { data: videoExists, error: checkError } = await supabase
      .from('videos')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !videoExists) {
      console.error('Video not found:', id, checkError);
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check rate limit
    const { data: rateLimitData } = await supabase
      .from('view_rate_limits')
      .select('last_view_at')
      .eq('ip_address', clientIp)
      .eq('video_id', id)
      .single();

    if (rateLimitData) {
      const lastViewTime = new Date(rateLimitData.last_view_at).getTime();
      const now = Date.now();
      const timeSinceLastView = now - lastViewTime;

      if (timeSinceLastView < VIEW_COOLDOWN_MS) {
        const remainingMs = VIEW_COOLDOWN_MS - timeSinceLastView;
        const remainingMinutes = Math.ceil(remainingMs / 60000);

        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: `Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} before viewing again`,
            remainingMs
          },
          { status: 429 }
        );
      }
    }

    // Update or insert rate limit record
    const { error: rateLimitError } = await supabase
      .from('view_rate_limits')
      .upsert(
        {
          ip_address: clientIp,
          video_id: id,
          last_view_at: new Date().toISOString()
        },
        {
          onConflict: 'ip_address,video_id'
        }
      );

    if (rateLimitError) {
      console.error('Error updating rate limit:', rateLimitError);
      // Continue anyway - we don't want to block legitimate views
    }

    // Increment view count
    const { data, error } = await supabase
      .rpc('increment_video_view', { video_id: id });

    if (error) {
      console.error('Error incrementing view:', error);
      return NextResponse.json(
        { error: 'Failed to increment view' },
        { status: 500 }
      );
    }

    // Handle case where RPC returns empty array
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.error('RPC returned no data for video:', id);
      return NextResponse.json(
        { error: 'Failed to increment view' },
        { status: 500 }
      );
    }

    // RPC might return array or single object
    const result = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: true,
      view_count: result.view_count
    });
  } catch (error) {
    console.error('Error incrementing view:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
