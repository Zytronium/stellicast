'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

export default function TopBar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle search logic here
        console.log('Search:', searchQuery);
    };

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
          <Link href="/feed" className="text-sm text-gray-200 hover:text-blue-400">
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

        <div className="relative ml-4 min-w-fit">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-gray-900"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              U
            </div>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-800 bg-gray-900 shadow-lg">
              <div className="border-b border-gray-800 px-4 py-3">
                <p className="text-sm font-semibold">username</p>
                <p className="text-xs text-gray-400">Signed in</p>
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
                  onClick={() => {
                    setProfileMenuOpen(false);
                    console.log('Logout');
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}