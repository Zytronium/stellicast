'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';

function CompleteSignupForm() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAccount, setPendingAccount] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setError('No signup token provided');
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('pending_accounts')
          .select('*')
          .eq('signup_token', token)
          .eq('consent_status', 'approved')
          .single();

        if (error || !data) {
          setError('Invalid or expired signup link');
        } else {
          setPendingAccount(data);
        }
      } catch (err) {
        setError('Failed to verify signup token');
      } finally {
        setChecking(false);
      }
    }

    checkToken();
  }, [token, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      // Create the account with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: pendingAccount.child_email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            date_of_birth: pendingAccount.date_of_birth,
            parent_email: pendingAccount.parent_email,
          }
        }
      });

      if (signUpError) throw signUpError;

      // Mark the pending account as completed
      const { error: updateError } = await supabase
        .from('pending_accounts')
        .update({ consent_status: 'completed' })
        .eq('signup_token', token);

      if (updateError) console.error('Failed to update pending account:', updateError);

      // Redirect to home
      router.push('/');
    } catch (err: any) {
      setError(err.message ?? 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-black text-foreground">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Verifying your signup link...</p>
        </div>
      </div>
    );
  }

  if (!pendingAccount) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-black text-foreground">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold text-destructive">Invalid Link</h1>
          <p className="mt-4 text-muted-foreground">{error || 'This signup link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-black text-foreground relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-blue-600/30 rounded-full blur-3xl animate-pulse animation-duration-5000" />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
              Complete Your Signup
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome! Create a password for <strong>{pendingAccount.child_email}</strong>
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-card-foreground">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="At least 8 characters"
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-card-foreground">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Re-enter your password"
                minLength={8}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive-foreground">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
          >
            {loading ? 'Creating Account...' : 'Create My Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CompleteSignupPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 to-black text-foreground">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <CompleteSignupForm />
    </Suspense>
  );
}
