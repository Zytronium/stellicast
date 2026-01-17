'use client';

import './globals.css';
import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "../lib/supabase-client";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeClass, setThemeClass] = useState<string>('');
  const pathname = usePathname();
  const pathsWithFilters = ['/explore']; // and `/`
  const pathsWithoutSidebar = ['/about', '/auth'];
  const pathsWithoutPadding = ['/channel/', '/user/', '/profile'];
  const pathsWithoutBottomNav: string[] = [];

  const showFilters = pathsWithFilters.some(path => pathname.startsWith(path)) || pathname === '/';
  const showSidebar = !pathsWithoutSidebar.some(path => pathname.startsWith(path));
  const noPadding = pathsWithoutPadding.some(path => pathname.startsWith(path));
  const showBottomNav = !pathsWithoutBottomNav.some(path => pathname.startsWith(path));

  const isWatchPage = pathname.startsWith('/watch');

  // Fetch user theme preference asynchronously
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const supabase = createSupabaseBrowserClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Not signed in, use default (no theme class)
          setThemeClass('');
          return;
        }

        // Get user's preferences
        const { data, error } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          // Error or no data, use default
          setThemeClass('');
          return;
        }

        const theme = data.preferences?.theme;

        // Map theme names to CSS classes
        // "spaceblue (dark)" is the default, so no class needed
        const themeMap: Record<string, string> = {
          'volcanic (dark)': 'theme-volcanic',
          'alien (dark)': 'theme-alien',
          'royalty (dark)': 'theme-royalty',
          'rose (dark)': 'theme-rose',
          'simple dark': 'theme-simple-dark',
          'moonshine (dim)': 'theme-moonshine',
          'moonset (dim)': 'theme-moonset',
          'forestry (dim)': 'theme-forestry',
          'lava lamp (dim)': 'theme-lava-lamp',
          'simple dim': 'theme-simple-dim',
          'palewhite (light)': 'theme-palewhite',
          'rose quartz (light)': 'theme-rose-quartz',
          'simple light': 'theme-simple-light',
          'colormatic': 'theme-colormatic',
        };

        const lightThemes = new Set([
          'simple light',
          'palewhite (light)',
          'rose quartz (light)'
        ]);

        const baseTheme = themeMap[theme] || '';
        const isLight = lightThemes.has(theme);

        setThemeClass(isLight ? `${baseTheme} light` : baseTheme);
      } catch (error) {
        console.error('Error fetching theme:', error);
        setThemeClass('');
      }
    };

    fetchTheme();
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <html lang="en" className="scroll-smooth">
    <head>
      <title>Stellicast – The YouTube Alternative We&apos;re Still Waiting For</title>
      <meta name="description"
            content="A work-in-progress, open-source, privacy‑first video platform that doesn't sell user data, doesn't bombard you with ads, listens to user feedback, and promotes non-corporate, human-made content." />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
      <link rel="icon" href="/favicon.ico" />
    </head>
    <body className={`bg-background text-foreground ${themeClass}`.trim()}>
    <TopBar
      onFilterClick={() => setSidebarOpen(true)}
      showFilters={showFilters}
    />
    <div className="flex h-[calc(100vh-64px)]">
      { showSidebar && (
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          showFilters={showFilters}
        />
      )}
          <main
            className={[
          'flex-1 overflow-y-auto transition-all duration-300',
          showBottomNav ? 'pb-16 md:pb-0' : '',
          (showSidebar && sidebarOpen) ? 'md:pl-64' : 'md:pl-0',
            ].join(' ')}
          >
            <div className="min-h-full bg-gradient-darker flex flex-col">
              <div
                className={[
                  'w-full flex-1 flex flex-col',
                  noPadding
                    ? 'pb-6'
                    : isWatchPage
                      ? 'px-0 pt-0 pb-6 md:px-6 lg:pl-10 md:py-6'
                      : 'px-2 md:px-6 lg:pl-10 py-6',
                ].join(' ')}
              >
                {children}
              </div>
            </div>
          </main>
        </div>
    {showBottomNav && <BottomNav />}
    </body>
    </html>
  );
}
