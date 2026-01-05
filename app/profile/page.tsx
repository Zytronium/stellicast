import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { redirect } from 'next/navigation';
import ProfilePageClient from './ProfilePageClient';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();

  // Get current user
  const { data: userData } = await supabase.auth.getUser();
  const currentUser = userData?.user ?? null;

  if (!currentUser) {
    redirect('/auth');
  }

  // Get user profile data
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error || !user) {
    redirect('/auth');
  }

  // Get user's channels
  const { data: channels } = await supabase
    .from('channels')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  return <ProfilePageClient user={user} channels={channels || []} />;
}