// -------- notification helper --------
// Calls the send-application-decision Supabase edge function, which sends
// the actual email via Resend (mirrors send-parental-consent).

interface ApplicationDecisionEmailParams {
    email: string;
    displayName: string;
    status: 'accepted' | 'rejected';
    note?: string | null;
}

export async function notifyApplicationDecision(
    params: ApplicationDecisionEmailParams
): Promise<void> {
    const functionsUrl = `${process.env.SUPABASE_URL}/functions/v1/send-application-decision`;

    const res = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(params),
    });

    if (!res.ok) {
        const error = await res.text();
        // don't throw, a failed email shouldn't undo the approval/rejection
        console.error('Failed to send application decision email:', error);
    }
}
