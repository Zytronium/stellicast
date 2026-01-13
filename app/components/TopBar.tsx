'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon, ChevronDownIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { createSupabaseBrowserClient } from '@/../lib/supabase-client';
import type { User, AuthError, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface TopBarProps {
  onFilterClick?: () => void;
  showFilters?: boolean;
}

export default function TopBar({ onFilterClick, showFilters = false }: TopBarProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then((response: { data: { user: User | null }, error: AuthError | null }) => {
      const user = response.data.user;
      setUser(user);
      setLoading(false);

      // Fetch profile data if user exists (non-blocking)
      if (user) {
        supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .eq('id', user.id)
          .single()
          .then((result: { data: UserProfile | null, error: any }) => {
            if (result.error) {
              console.error('Error fetching profile:', result.error);
              return;
            }
            if (result.data) {
              setUserProfile(result.data);
            }
          });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const newUser = session?.user ?? null;
      setUser(newUser);

      // Fetch profile for new user
      if (newUser) {
        supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .eq('id', newUser.id)
          .single()
          .then((result: { data: UserProfile | null, error: any }) => {
            if (result.error) {
              console.error('Error fetching profile:', result.error);
              return;
            }
            if (result.data) {
              setUserProfile(result.data);
            }
          });
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search:', searchQuery);
  };

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await supabase.auth.signOut();
    router.refresh();
  };

  const displayName = userProfile?.display_name || userProfile?.username || user?.email?.split('@')[0] || 'User';
  const avatarUrl = userProfile?.avatar_url;

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border backdrop-blur bg-gradient">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link className="flex min-w-fit cursor-pointer items-center gap-2" href="/">
          {/* Mobile: Square logo */}
          <div className="md:hidden w-8 h-8 relative">
            <Image
              src="/logo.png"
              alt="Stellicast"
              width={32}
              height={32}
              className="rounded-lg hue-rotate-(--logo-hue-rotate)"
              priority
            />
          </div>
          {/* Desktop: Full logo */}
          <Image
            src="/stellicast_smaller.png"
            alt="Stellicast"
            width={187.4}
            height={32}
            className="hidden md:block h-8 w-auto hue-rotate-(--logo-hue-rotate)"
            priority
          />
        </Link>

        {/* Desktop Search - Hidden on mobile */}
        <form onSubmit={handleSearch} className="mx-8 hidden flex-1 max-w-xl lg:block">
          <div className="flex">
            <input
              type="text"
              placeholder="Search videos, creators, topics…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-l-xl border border-border bg-input px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-4 focus:ring-ring/10"
            />
            <button
              type="submit"
              className="rounded-r-xl border border-l-0 border-border bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/80"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </div>
        </form>

        {/* Mobile Search & Filters */}
        <div className="flex items-center gap-2 flex-1 justify-center lg:hidden">
          {showFilters && (
            <button
              onClick={onFilterClick}
              className="p-2 hover:bg-muted rounded-lg transition-colors text-foreground"
              aria-label="Filters"
            >
              <FunnelIcon className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-foreground"
            aria-label="Search"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Desktop Navigation - Hidden on mobile */}
        <nav className="hidden min-w-fit items-center gap-6 lg:flex">
          <Link href="/" className="text-sm text-foreground/80 hover:text-accent">
            Feed
          </Link>
          <Link href="/upload" className="text-sm text-foreground/80 hover:text-accent">
            Upload
          </Link>
          <Link href="/settings" className="text-sm text-foreground/80 hover:text-accent">
            Settings
          </Link>
          <Link href="/more" className="text-sm text-foreground/80 hover:text-accent">
            More
          </Link>
        </nav>

        {/* Profile/Login Button */}
        <div className="relative ml-2 md:ml-4 min-w-fit">
          {loading ? (
            <div className="h-10 w-10 md:w-20 animate-pulse rounded-xl bg-muted"></div>
          ) : user ? (
            <>
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 rounded-xl px-2 py-2 md:px-3 hover:bg-muted"
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
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDownIcon className={`h-4 w-4 hidden md:block transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold truncate text-popover-foreground">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/account"
                      className="block px-4 py-2 text-sm text-popover-foreground hover:bg-muted"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Account
                    </Link>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-popover-foreground hover:bg-muted"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-muted"
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
              className="px-3 md:px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-background lg:hidden">
          <div className="h-16 border-b border-border flex items-center px-4 gap-2">
            <button
              onClick={() => setSearchOpen(false)}
              className="p-2 hover:bg-muted rounded-lg text-foreground"
              aria-label="Close search"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <input
                type="text"
                placeholder="Search videos, creators, topics…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 rounded-xl border border-border bg-input px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-4 focus:ring-ring/10"
              />
              <button
                type="submit"
                className="p-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                aria-label="Search"
              >
                <MagnifyingGlassIcon className="h-6 w-6" />
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
