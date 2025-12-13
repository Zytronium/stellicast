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
        <header className="h-16 bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-gray-800 flex items-center px-6 justify-between sticky top-0 z-50">
            {/* Logo and Title */}
            <div className="flex items-center gap-2 min-w-fit">
                <Image
                    src="/stellicast_smaller.png"
                    alt="Stellicast Logo"
                    width={187.4}
                    height={32}
                    className="h-8"
                />
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 mx-8 max-w-md">
                <div className="flex">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-l-lg bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-none focus:border-blue-500"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 border-l-0 rounded-r-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                    >
                        <MagnifyingGlassIcon className="w-5 h-5" />
                    </button>
                </div>
            </form>

            {/* Navigation Links */}
            <nav className="flex items-center gap-6 min-w-fit">
                <Link href="/feed" className="hover:text-blue-500 transition-colors">
                    Feed
                </Link>
                <Link href="/upload" className="hover:text-blue-500 transition-colors">
                    Upload
                </Link>
                <Link href="/more" className="hover:text-blue-500 transition-colors">
                    More
                </Link>
                <Link href="/settings" className="hover:text-blue-500 transition-colors">
                    Settings
                </Link>
            </nav>

            {/* Profile Icon and Dropdown */}
            <div className="relative ml-8 min-w-fit">
                <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        U
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                            <p className="text-sm font-semibold">username</p>
                        </div>
                        <div className="py-2">
                            <Link
                                href="/account"
                                className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => setProfileMenuOpen(false)}
                            >
                                Account
                            </Link>
                            <Link
                                href="/profile"
                                className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => setProfileMenuOpen(false)}
                            >
                                Profile
                            </Link>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-red-500"
                                onClick={() => {
                                    setProfileMenuOpen(false);
                                    // Handle logout logic
                                    console.log('Logout');
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}