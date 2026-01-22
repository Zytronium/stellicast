import { createSupabaseServerClient } from '@/../lib/supabase-server';

export default async function ConsentPage({
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
    // Get pending account details
    const { data: pending, error: fetchError } = await supabase
      .from('pending_accounts')
      .select('*')
      .eq('consent_token', token)
      .eq('consent_status', 'pending')
      .single();

    if (fetchError || !pending) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-black text-foreground">
          <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="text-2xl font-semibold text-destructive">Invalid or Expired</h1>
            <p className="mt-4 text-muted-foreground">
              This consent link is invalid or has already been used.
            </p>
          </div>
        </div>
      );
    }

    // Update consent status
    const { error: updateError } = await supabase
      .from('pending_accounts')
      .update({ consent_status: 'approved' })
      .eq('consent_token', token);

    if (updateError) throw updateError;

    // Send completion email to child
    const { error: emailError } = await supabase.functions.invoke('send-signup-completion', {
      body: {
        childEmail: pending.child_email,
        signupToken: pending.signup_token,
        dateOfBirth: pending.date_of_birth,
        parentEmail: pending.parent_email,
      }
    });

    if (emailError) {
      console.error('Failed to send completion email:', emailError);
      // Don't throw - consent was approved, just notify parent to contact support
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-black text-foreground">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <svg
              className="h-8 w-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-card-foreground">
            Consent Approved!
          </h1>
          <p className="mt-4 text-muted-foreground">
            Thank you for approving the account creation request.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            We've sent an email to <strong>{pending.child_email}</strong> with instructions to complete their signup and set a password.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Consent error:', error);
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-black text-foreground">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold text-destructive">Error</h1>
          <p className="mt-4 text-muted-foreground">
            An error occurred while processing consent. Please contact support.
          </p>
        </div>
      </div>
    );
  }
}
