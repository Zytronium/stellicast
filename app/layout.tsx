'use client';

import './globals.css';
import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();
  const pathsWithFilters = ['/feed', '/explore']; // and `/`
  const pathsWithoutSidebar = ['/about', '/auth'];
  const showFilters = pathsWithFilters.some(path => pathname.startsWith(path) || pathname === '/');
  const showSidebar = !pathsWithoutSidebar.some(path => pathname.startsWith(path));

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  return (
    <html lang="en" className="scroll-smooth">
    <head>
      <title>Stellicast – The YouTube Alternative We&apos;re Still Waiting For</title>
      <meta name="description"
            content="A work-in-progress, open-source, privacy‑first video platform that doesn't sell user data, doesn't bombard you with ads, listens to user feedback, and promotes non-corporate, human-made content." />
      <link rel="icon" href="/favicon.ico" />
    </head>
    <body className="bg-[#0a0a0a] text-white">
    <TopBar />
    <div className="flex h-[calc(100vh-64px)]">
      { showSidebar && <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} showFilters={showFilters} /> }
          <main
            className={[
              'flex-1 overflow-y-auto transition-[padding-left] duration-300',
              (showSidebar && sidebarOpen) ? 'pl-64' : 'pl-0',
            ].join(' ')}
          >
            <div className="min-h-full bg-gradient-darker flex flex-col">
              <div className="w-full px-6 pl-10 py-6 flex-1 flex flex-col">{children}</div>
            </div>
          </main>
        </div>
    </body>
    </html>
  );
}
