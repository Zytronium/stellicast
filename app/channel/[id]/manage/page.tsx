import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { notFound, redirect } from 'next/navigation';
import ManageChannelClient from './ManageChannelClient';

type PageParams = {
  id: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function ManageChannel({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Get current user
  const { data: userData } = await supabase.auth.getUser();
  const currentUser = userData?.user ?? null;

  if (!currentUser) {
    redirect('/login');
  }

  // Get channel data
  const { data: channel, error } = await supabase
    .from('channels')
    .select('*')
    .eq('handle', id.toLowerCase())
    .single();

  if (error || !channel) {
    notFound();
  }

  // Check if user is owner
  if (currentUser.id !== channel.owner_id) {
    redirect(`/channel/${channel.handle}`);
  }

  // Get videos
  const { data: videos } = await supabase
    .from('videos')
    .select('*')
    .eq('channel_id', channel.id)
    .order('created_at', { ascending: false });

  return <ManageChannelClient channel={channel} videos={videos || []} />;
}
