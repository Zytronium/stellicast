'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { XMarkIcon } from '@heroicons/react/24/solid';

const STORAGE_KEY = 'stellicast_welcome_banner_dismissed';

interface WelcomeBannerProps {
    isLoggedIn: boolean;
    authLoaded: boolean;
}

export default function WelcomeBanner({ isLoggedIn, authLoaded }: WelcomeBannerProps) {
    // Keep render state in a way that avoids hydration mismatch:
    // we start hidden and reveal only after the client confirms eligibility.
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!authLoaded) return;
        if (isLoggedIn) return;

        try {
            const dismissed = localStorage.getItem(STORAGE_KEY);
            if (!dismissed) {
                setVisible(true);
            }
        } catch {
            // localStorage unavailable (private browsing restrictions, etc.) - skip banner
        }
    }, [authLoaded, isLoggedIn]);

    const dismiss = () => {
        setVisible(false);
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
            // ignore
        }
    };

    if (!visible) return null;

    return (
        <div
            className="flex items-center justify-between gap-3 px-4 py-2 bg-primary text-primary-foreground text-sm rounded-b-sm"
            role="banner"
        >
      <span className="flex-1 text-center">
        New to Stellicast?{' '}
          <Link
              href="/about"
              className="underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity"
              onClick={dismiss}
          >
          Click here
        </Link>{' '}
          to learn more about it.
      </span>
            <button
                onClick={dismiss}
                aria-label="Dismiss banner"
                className="shrink-0 p-1 rounded hover:bg-primary-foreground/10 transition-colors"
            >
                <XMarkIcon className="h-4 w-4" />
            </button>
        </div>
    );
}
