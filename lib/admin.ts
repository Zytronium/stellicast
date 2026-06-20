import { SupabaseClient } from '@supabase/supabase-js';

// -------- stub admin check --------
// TODO: replace this with a real check once roles/permissions exist on
// public.users (or wherever we decide to store admin status). For now,
// this is a hardcoded allowlist of user IDs so the admin panel can be
// gated off something while that's being built.
const STUB_ADMIN_USER_IDS: string[] = [
    'b34ab82d-1d0e-4d78-ac2b-4897a2e55a02',
    '7d7396d4-4af2-4460-ab9d-bd1e85159004'
];

export function isAdminUser(userId: string): boolean {
    return STUB_ADMIN_USER_IDS.includes(userId);
}

// -------- shared helper for admin route guards --------
// Returns the authenticated user if they're an admin, or null otherwise.
// Routes can use this to short-circuit with a 401/403.
export async function requireAdmin(supabase: SupabaseClient) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    if (!isAdminUser(user.id)) return null;
    return user;
}
