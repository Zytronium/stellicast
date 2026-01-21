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
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [isUnder13, setIsUnder13] = useState(false);
  const [pendingConsent, setPendingConsent] = useState(false);

  function calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error)
          throw error;
        router.push('/');
      } else {
        if (!agreedToTerms) {
          throw new Error('You must agree to the Terms of Use and Privacy Policy');
        }
        if (!dateOfBirth) {
          throw new Error('Please enter your date of birth');
        }

        const age = calculateAge(dateOfBirth);

        if (age < 13) {
          if (!parentEmail) {
            setIsUnder13(true);
            throw new Error('Parental consent required for users under 13');
          }

          // Call the edge function to create pending account
          const { data, error: functionError } = await supabase.functions.invoke('create-pending-account', {
            body: {
              childEmail: email,
              parentEmail: parentEmail,
              dateOfBirth: dateOfBirth,
              password: password  // Send password to be hashed by edge function
            }
          });

          if (functionError) throw functionError;

          // Send parental consent email
          const { error: emailError } = await supabase.functions.invoke('send-parental-consent', {
            body: {
              parentEmail,
              childEmail: email,
              dateOfBirth
            }
          });

          if (emailError) throw emailError;

          setPendingConsent(true);
          setLoading(false);
          return;
        }

        // User is 13 or older, proceed normally
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              date_of_birth: dateOfBirth
            }
          }
        });
        if (error) throw error;
      router.push('/');
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (pendingConsent) {
    return (
      <div className="flex flex-1 items-center justify-center text-foreground relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-blue-600/30 rounded-full blur-3xl animate-pulse animation-duration-5000" />
        </div>

        <div className="w-full max-w-md space-y-6 relative z-10">
          <div className="space-y-6 rounded-2xl border border-border bg-card p-8">
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-card-foreground">Parental Consent Required</h2>
              <p className="text-sm text-muted-foreground">
                We've sent an email to <strong>{parentEmail}</strong> with a consent request.
                Your parent or guardian must approve before your account can be created.
              </p>
              <p className="text-xs text-muted-foreground">
                The email includes details about what data we collect and why.
              </p>
            </div>
            <button
              onClick={() => {
                setPendingConsent(false);
                setParentEmail('');
                setIsUnder13(false);
              }}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
            >
              Back to Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center text-foreground relative overflow-hidden">
      {/* Animated gradient blur background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-blue-600/30 rounded-full blur-3xl animate-pulse animation-duration-5000" />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-8">
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

            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-card-foreground">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => {
                      setDateOfBirth(e.target.value);
                      if (e.target.value && calculateAge(e.target.value) < 13) {
                        setIsUnder13(true);
                      } else {
                        setIsUnder13(false);
                        setParentEmail('');
                      }
                    }}
                    className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                {isUnder13 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-card-foreground">
                      Parent/Guardian Email
                    </label>
                    <input
                      type="email"
                      required
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="parent@example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      We&apos;ll send a consent request to your parent or guardian.
                    </p>
                  </div>
                )}
              </>
            )}
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
                  {isUnder13 && ' on behalf of my child'}
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
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
          >
            {loading ? 'Working...' : mode === 'signin' ? 'Sign in' : isUnder13 ? 'Request Parental Consent' : 'Create account'}
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
        </div>
      </div>
    </div>
  );
}
