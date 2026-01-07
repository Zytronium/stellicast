'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function TopBar() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const initAttemptedRef = useRef(false);

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!mountedRef.current) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (mountedRef.current) {
      setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [supabase]);

  useEffect(() => {
    mountedRef.current = true;

    // Get initial user
    const initAuth = async () => {
      // Prevent multiple initialization attempts
      if (initAttemptedRef.current) return;
      initAttemptedRef.current = true;

      try {
        // Add a small delay to ensure Supabase is fully initialized
        await new Promise(resolve => setTimeout(resolve, 50));

      const { data: { session }, error } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

      if (error) {
        console.error('Session error:', error);
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

        if (session?.user) {
      setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Set null states but don't throw
        if (mountedRef.current) {
          setUser(null);
          setUserProfile(null);
        }
      } finally {
        if (mountedRef.current) {
      setLoading(false);
      }
      }
    };

    initAuth();

    // Listen for auth changes
const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state changed:', event); // Debug log

        if (!mountedRef.current) return;

        // Handle different auth events
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            setUser(session.user);
            await fetchUserProfile(session.user.id);
          }
        } else if (event === 'INITIAL_SESSION') {
          // Handle initial session separately
      if (session?.user) {
            setUser(session.user);
        await fetchUserProfile(session.user.id);
          }
      }
    }
  );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, supabase]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search:', searchQuery);
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    try {
    await supabase.auth.signOut();
    router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const displayName = userProfile?.display_name || userProfile?.username || user?.email?.split('@')[0] || 'User';
  const avatarUrl = userProfile?.avatar_url;

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-gray-800 backdrop-blur bg-gradient">
      <div className="flex h-full items-center justify-between px-6">
        <Link className="flex min-w-fit cursor-pointer items-center gap-2" href="/">
          <Image
            src="/stellicast_smaller.png"
            alt="Stellicast"
            width={187.4}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>

        <form onSubmit={handleSearch} className="mx-8 hidden flex-1 max-w-xl md:block">
          <div className="flex">
            <input
              type="text"
              placeholder="Search videos, creators, topics…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-l-xl border border-gray-700 bg-gray-900 px-4 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10"
            />
            <button
              type="submit"
              className="rounded-r-xl border border-l-0 border-gray-700 bg-gray-800 px-4 py-2 hover:bg-gray-700"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </div>
        </form>

        <nav className="hidden min-w-fit items-center gap-6 lg:flex">
          <Link href="/" className="text-sm text-gray-200 hover:text-blue-400">
            Feed
          </Link>
          <Link href="/upload" className="text-sm text-gray-200 hover:text-blue-400">
            Upload
          </Link>
          <Link href="/more" className="text-sm text-gray-200 hover:text-blue-400">
            More
          </Link>
          <Link href="/settings" className="text-sm text-gray-200 hover:text-blue-400">
            Settings
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="relative ml-4 min-w-fit">
          {loading ? (
            <div className="h-10 w-20 animate-pulse rounded-xl bg-gray-800"></div>
          ) : user ? (
            <>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-gray-900"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDownIcon className={`h-4 w-4 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-800 bg-gray-900 shadow-lg">
                  <div className="border-b border-gray-800 px-4 py-3">
                    <p className="text-sm font-semibold truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/account"
                      className="block px-4 py-2 text-sm hover:bg-gray-800"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Account
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm hover:bg-gray-800"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-800"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/auth"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
