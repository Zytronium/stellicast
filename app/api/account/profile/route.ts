import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile from public.users
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || user.email?.split('@')[0],
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
        banner_url: profile?.banner_url,
        description: profile?.description,
        created_at: profile?.created_at,
        updated_at: profile?.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username, display_name, description, avatar_url, banner_url } = body;

    // Get current profile
    const { data: currentProfile, error: fetchError } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Handle username change if provided and different
    if (username !== undefined && username !== currentProfile.username) {
      // Validate username format
      if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
        return NextResponse.json({
          error: 'Username must be between 3 and 30 characters'
        }, { status: 400 });
      }

      // Check if username contains only valid characters (alphanumeric, underscore, hyphen)
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return NextResponse.json({
          error: 'Username can only contain letters, numbers, underscores, and hyphens'
        }, { status: 400 });
      }

      // Check rate limit (3 changes per 24 hours)
      const { data: canChange, error: rateLimitError } = await supabase
        .rpc('can_change_username', { p_user_id: user.id });

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
        return NextResponse.json({ error: 'Failed to check rate limit' }, { status: 500 });
      }

      if (!canChange) {
        return NextResponse.json({
          error: 'You can only change your username 3 times per day. Please try again later.'
        }, { status: 429 });
      }

      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        return NextResponse.json({ error: checkError.message }, { status: 500 });
      }

      if (existingUser) {
        return NextResponse.json({
          error: 'Username is already taken'
        }, { status: 409 });
      }

      // Record the username change
      const { error: recordError } = await supabase
        .rpc('record_username_change', {
          p_user_id: user.id,
          p_old_username: currentProfile.username,
          p_new_username: username.toLowerCase()
        });

      if (recordError) {
        console.error('Failed to record username change:', recordError);
        // Continue anyway - this is just for tracking
      }
    }

    // Validate other input fields
    if (display_name !== undefined && typeof display_name !== 'string') {
      return NextResponse.json({ error: 'Invalid display_name' }, { status: 400 });
    }

    if (description !== undefined && typeof description !== 'string') {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
    }

    if (avatar_url !== undefined && typeof avatar_url !== 'string') {
      return NextResponse.json({ error: 'Invalid avatar_url' }, { status: 400 });
    }

    if (banner_url !== undefined && typeof banner_url !== 'string') {
      return NextResponse.json({ error: 'Invalid banner_url' }, { status: 400 });
    }

    // Build update object with only provided fields
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (username !== undefined && username !== currentProfile.username) {
      updates.username = username.toLowerCase();
    }
    if (display_name !== undefined) updates.display_name = display_name;
    if (description !== undefined) updates.description = description;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (banner_url !== undefined) updates.banner_url = banner_url;

    const { data: profile, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || user.email?.split('@')[0],
        display_name: profile?.display_name,
        avatar_url: profile?.avatar_url,
        banner_url: profile?.banner_url,
        description: profile?.description,
        created_at: profile?.created_at,
        updated_at: profile?.updated_at,
      },
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}