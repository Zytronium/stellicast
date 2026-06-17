/**
 * IMPORTANT — slug immutability is enforced at multiple layers:
 *
 * 1. UI (ManageSectorClient): the slug field is read-only; no edit controls are rendered.
 * 2. Client update payload: `slug` is intentionally omitted from every `.update()` call.
 * 3. Database (required): add the following RLS policy / trigger in Supabase so that even
 *    a direct API call cannot mutate the slug:
 *
 *    -- Option A: Postgres trigger (recommended)
 *    CREATE OR REPLACE FUNCTION sectors_prevent_slug_change()
 *    RETURNS TRIGGER LANGUAGE plpgsql AS $$
 *    BEGIN
 *      IF NEW.slug IS DISTINCT FROM OLD.slug THEN
 *        RAISE EXCEPTION 'sector slug is immutable';
 *      END IF;
 *      RETURN NEW;
 *    END;
 *    $$;
 *    CREATE TRIGGER sectors_slug_immutable
 *      BEFORE UPDATE ON sectors
 *      FOR EACH ROW EXECUTE FUNCTION sectors_prevent_slug_change();
 *
 *    -- Option B: RLS update policy (if you prefer policy-based enforcement)
 *    CREATE POLICY "no slug mutation" ON sectors
 *      AS RESTRICTIVE FOR UPDATE
 *      USING (slug = current_setting('app.requested_slug', true));
 */
import { createSupabaseServerClient } from '@/../lib/supabase-server';
import { notFound, redirect } from 'next/navigation';
import ManageSectorClient from './ManageSectorClient';

type PageProps = {
    params: Promise<{ id: string }>;
};

export default async function ManageSectorPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/auth');

    // Fetch sector by slug
    const { data: sector, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('slug', id.toLowerCase())
        .single();

    if (error || !sector) notFound();

    // Role check - must be owner or moderator
    const { data: membership } = await supabase
        .from('sector_members')
        .select('roles')
        .eq('sector_id', sector.id)
        .eq('user_id', user.id)
        .single();

    const roles: string[] = membership?.roles ?? [];
    const isOwner = roles.includes('owner');
    const isMod = roles.includes('moderator');

    if (!isOwner && !isMod) redirect(`/s/${sector.slug}`);

    return <ManageSectorClient sector={sector} memberRole={isOwner ? 'owner' : 'moderator'} />;
}
