
'use client';

import './globals.css';
import { useState } from 'react';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <html lang="en" className="scroll-smooth">
        <head>
            <title>Stellicast – The YouTube Alternative We&apos;re Still Waiting For</title>
            <meta name="description" content="Privacy‑first video platform with transparent AI policies." />
            <link rel="icon" href="/favicon.ico" />
        </head>
        <body className="bg-white dark:bg-[#0a0a0a] text-black dark:text-white">
        <TopBar />
        <div className="flex h-[calc(100vh-64px)]">
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
          <main className="flex-1 overflow-y-auto">
            <div className="min-h-full bg-gradient-to-b from-transparent to-black/5 dark:to-white/5">
              <div className="mx-auto w-full max-w-7xl px-6 py-6">
                {children}
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}