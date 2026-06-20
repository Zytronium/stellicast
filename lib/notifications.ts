// -------- stub notification helper --------
// TODO: wire this up to actual email sending (e.g. a Supabase edge
// function similar to send-parental-consent / send-signup-completion)
// once that infrastructure is ready. Calling this is a no-op for now,
// but keeps a single place to plug email sending into later.

interface ApplicationDecisionEmailParams {
    userId: string;
    status: 'accepted' | 'rejected';
    displayName: string;
    note?: string | null;
}

export async function notifyApplicationDecision(
    params: ApplicationDecisionEmailParams
): Promise<void> {
    // -------- intentionally not implemented yet --------
    console.log('[notifyApplicationDecision] stub called with:', params);
}
