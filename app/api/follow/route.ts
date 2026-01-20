import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { channelId, notify = 'none' } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Validate notify value
    if (!['none', 'trending', 'all'].includes(notify)) {
      return NextResponse.json({ error: 'Invalid notify value' }, { status: 400 });
    }

    // Check if channel exists and get owner_id
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, owner_id')
      .eq('id', channelId)
      .single();

    if (channelError || !channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Prevent users from following their own channels
    if (channel.owner_id === user.id) {
      return NextResponse.json({ error: 'Cannot follow your own channel' }, { status: 403 });
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('followers')
      .select('*')
      .eq('user_id', user.id)
      .eq('channel_id', channelId)
      .single();

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following this channel' }, { status: 409 });
    }

    // Insert follower record
    const { error: insertError } = await supabase
      .from('followers')
      .insert({
        user_id: user.id,
        channel_id: channelId,
        notify,
        following_since: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Follow insert error:', insertError);
      return NextResponse.json({ error: 'Failed to follow channel' }, { status: 500 });
    }

    // Increment follower count
    const { error: updateError } = await supabase.rpc('increment_follower_count', {
      p_channel_id: channelId,
    });

    if (updateError) {
      console.error('Follower count update error:', updateError);
      // Non-critical error, don't fail the request
    }

    return NextResponse.json({ success: true, notify }, { status: 200 });
  } catch (error) {
    console.error('Follow API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    // Delete follower record
    const { error: deleteError } = await supabase
      .from('followers')
      .delete()
      .eq('user_id', user.id)
      .eq('channel_id', channelId);

    if (deleteError) {
      console.error('Unfollow delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to unfollow channel' }, { status: 500 });
    }

    // Decrement follower count
    const { error: updateError } = await supabase.rpc('decrement_follower_count', {
      p_channel_id: channelId,
    });

    if (updateError) {
      console.error('Follower count update error:', updateError);
      // Non-critical error, don't fail the request
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unfollow API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { channelId, notify } = body;

    if (!channelId || !notify) {
      return NextResponse.json({ error: 'Channel ID and notify value are required' }, { status: 400 });
    }

    // Validate notify value
    if (!['none', 'trending', 'all'].includes(notify)) {
      return NextResponse.json({ error: 'Invalid notify value' }, { status: 400 });
    }

    // Update notification preference
    const { error: updateError } = await supabase
      .from('followers')
      .update({ notify })
      .eq('user_id', user.id)
      .eq('channel_id', channelId);

    if (updateError) {
      console.error('Notification update error:', updateError);
      return NextResponse.json({ error: 'Failed to update notification preference' }, { status: 500 });
    }

    return NextResponse.json({ success: true, notify }, { status: 200 });
  } catch (error) {
    console.error('Notification update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // Not authenticated - return false
      return NextResponse.json({ isFollowing: false, notify: null }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const { data: follower, error: queryError } = await supabase
      .from('followers')
      .select('notify')
      .eq('user_id', user.id)
      .eq('channel_id', channelId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no match

    if (queryError) {
      console.error('Error checking follow status:', queryError);
      return NextResponse.json({ isFollowing: false, notify: null }, { status: 200 });
    }

    return NextResponse.json({
      isFollowing: !!follower,
      notify: follower?.notify || null
    }, { status: 200 });
  } catch (error) {
    console.error('Follow status check error:', error);
    return NextResponse.json({ isFollowing: false, notify: null }, { status: 200 });
  }
}
