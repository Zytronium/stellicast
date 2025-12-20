import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/../lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      channel_type,
      display_name,
      handle,
      description,
      website,
      company_name,
      business_email,
    } = body;

    // Validate required fields
    if (!channel_type || !display_name || !handle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (channel_type === 'studio' && !company_name) {
      return NextResponse.json(
        { error: 'Company name is required for studio channels' },
        { status: 400 }
      );
    }

    // Check if handle is already taken
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('id')
      .eq('handle', handle)
      .single();

    if (existingChannel) {
      return NextResponse.json(
        { error: 'Handle is already taken' },
        { status: 400 }
      );
    }

    // Create channel
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        owner_id: user.id,
        channel_type,
        display_name,
        handle,
        description: description || null,
      })
      .select()
      .single();

    if (channelError) throw channelError;

    // Create type-specific record
    if (channel_type === 'creator') {
      const { error: creatorError } = await supabase
        .from('creators')
        .insert({
          channel_id: channel.id,
          website: website || null,
          social_links: [],
        });

      if (creatorError) throw creatorError;
    } else if (channel_type === 'studio') {
      const { error: studioError } = await supabase
        .from('studios')
        .insert({
          channel_id: channel.id,
          company_name,
          business_email: business_email || null,
          verified: false,
          team_size: 1,
        });

      if (studioError) throw studioError;
    }

    return NextResponse.json({ success: true, channel });
  } catch (error: any) {
    console.error('Channel creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
