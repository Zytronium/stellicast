'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';

export default function AuthPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

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
    <div className="flex flex-1 items-center justify-center text-white">
      <div className="w-full max-w-md space-y-6">
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-gray-800 bg-[#0a0a0a] p-8"
        >
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === 'signin' ? 'Sign in to Stellicast' : 'Create your account'}
            </h1>
            <p className="text-sm text-gray-400">
              {mode === 'signin'
                ? 'Welcome back! Enter your credentials to continue.'
                : 'Join the future of video streaming.'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-lg border border-gray-800 bg-black px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="w-full rounded-lg border border-gray-800 bg-black px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                  className="rounded border-gray-800 bg-black text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm text-gray-400">
                  I agree to the{' '}
                  <a href="/terms-of-use" className="text-blue-500 hover:text-blue-400"
                     target="_blank">
                    Terms of Use
                  </a>{' '}
                  and{' '}
                  <a href="/privacy-policy" className="text-blue-500 hover:text-blue-400"
                     target="_blank">
                    Privacy Policy
                  </a>
                </span>
              </label>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950/30 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-gray-400 hover:text-gray-200 cursor-pointer transition-colors duration-200"
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
  );
}
