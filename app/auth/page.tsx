'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';

export default function AuthPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push('/');
      }
    };
    checkUser();
  }, [supabase, router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!agreedToTerms) {
          throw new Error('You must agree to the Terms of Use and Privacy Policy');
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col text-foreground relative overflow-hidden">
      {/* Technical difficulties banner */}
      <div className="w-full bg-destructive py-3 px-4 rounded-xl">
        <p className="text-sm text-white text-center font-medium">
          We are currently experiencing temporary technical difficulties with account creation. We are actively working on resolving the issue.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center relative overflow-hidden">
      {/* Animated gradient blur background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-blue-600/30 rounded-full blur-3xl animate-pulse animation-duration-5000" />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-border bg-card p-8"
        >
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
              {mode === 'signin' ? 'Sign in to Stellicast' : 'Create your account'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'signin'
                ? 'Welcome back! Enter your credentials to continue.'
                : 'Join the future of video streaming.'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-card-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-card-foreground">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="••••••••"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="rounded border-border bg-input text-primary focus:ring-ring"
                />
                <span className="text-sm text-muted-foreground">
                  I agree to the{' '}
                  <a href="/terms-of-use" className="text-primary hover:text-accent"
                     target="_blank">
                    Terms of Use
                  </a>{' '}
                  and{' '}
                  <a href="/privacy-policy" className="text-primary hover:text-accent"
                     target="_blank">
                    Privacy Policy
                  </a>
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive-foreground">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
          >
            {loading ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-200"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </div>
  );
}
