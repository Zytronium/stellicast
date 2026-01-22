import { createSupabaseServerClient } from '@/../lib/supabase-server';

export default async function ConsentRejectPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-black text-foreground">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold text-destructive">Invalid Request</h1>
          <p className="mt-4 text-muted-foreground">
            No consent token was provided.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();

  try {
    // Update consent status to rejected
    const { error } = await supabase
      .from('pending_accounts')
      .update({ consent_status: 'rejected' })
      .eq('consent_token', token)
      .eq('consent_status', 'pending');

    if (error) throw error;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-black text-foreground">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-card-foreground">
            Consent Rejected
          </h1>
          <p className="mt-4 text-muted-foreground">
            You have declined the account creation request. The account will not be created.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Reject consent error:', error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-black text-foreground">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold text-destructive">Error</h1>
          <p className="mt-4 text-muted-foreground">
            An error occurred. Please contact support.
          </p>
        </div>
      </div>
    );
  }
}