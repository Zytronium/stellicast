import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { requireAdmin } from '@/../lib/admin';
import AdminChannelApplicationsClient from './AdminChannelApplicationsClient';

export default async function AdminChannelApplicationsPage() {
    const supabase = await createSupabaseServerClient();
    const user = await requireAdmin(supabase);

    if (!user) {
        redirect('/');
    }

    return <AdminChannelApplicationsClient />;
}
