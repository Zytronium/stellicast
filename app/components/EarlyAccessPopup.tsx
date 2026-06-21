'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { X } from 'lucide-react';

const POPUP_SEEN_KEY = 'stellicast_early_access_popup_seen';

interface FrozenChannel {
    id: string;
    handle: string;
    display_name: string;
}

// -------- paths where the popup should never appear --------
// static/prefix matches: exact path, or any sub-path of it
const EXCLUDED_PATH_PREFIXES = [
    '/auth',
    '/privacy-policy',
    '/terms-of-use',
    '/rules',
    '/channel-early-access-agreement',
    '/about',
    '/channels/apply',
    '/complete-signup',
    '/consent', // also covers /consent/reject
    '/offline',
];

// dynamic-segment matches that a simple prefix check can't express
const EXCLUDED_PATH_PATTERNS = [
    /^\/channel\/[^/]+\/early-access\/?$/, // /channel/[id]/early-access
    /^\/embed\/[^/]+\/?$/,                 // /embed/[id]
];

function isExcludedPath(pathname: string): boolean {
    const normalized = (pathname || '/').replace(/\/+$/, '') || '/';

    const matchesPrefix = EXCLUDED_PATH_PREFIXES.some(
        (path) => normalized === path || normalized.startsWith(`${path}/`)
    );
    if (matchesPrefix) return true;

    return EXCLUDED_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

export default function EarlyAccessPopup() {
    const pathname = usePathname();
    const router = useRouter();

    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState<'intro' | 'select'>('intro');
    const [channels, setChannels] = useState<FrozenChannel[]>([]);
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        // already ran the check this session (shown, dismissed, or determined not eligible)
        if (checked) return;
        // can't show here, wait for a page where it's allowed
        if (isExcludedPath(pathname)) return;

        let alreadySeen = false;
        try {
            alreadySeen = window.localStorage.getItem(POPUP_SEEN_KEY) === '1';
        } catch {
            // localStorage unavailable (e.g. private browsing) - don't block the app, just skip
            setChecked(true);
            return;
        }

        if (alreadySeen) {
            setChecked(true);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const res = await fetch('/api/account/channels/frozen');
                if (!res.ok) return;

                const data = await res.json();
                const eligible: FrozenChannel[] = data.channels ?? [];

                if (cancelled) return;

                if (eligible.length > 0) {
                    setChannels(eligible);
                    setVisible(true);
                    // only persist "seen" once we've actually shown it
                    try {
                        window.localStorage.setItem(POPUP_SEEN_KEY, '1');
                    } catch {
                        console.error("Couldn't persist popup seen status in localStorage")
                        // ignore storage write errors
                    }
                }
            } catch (err) {
                console.error('Failed to check for frozen channels:', err);
            } finally {
                if (!cancelled) setChecked(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [pathname, checked]);

    // also hide if the user navigates to an excluded page while it's open
    if (!visible || isExcludedPath(pathname)) return null;

    const multiple = channels.length > 1;

    const handleSelectChannel = (handle: string) => {
        setVisible(false);
        router.push(`/channel/${handle}/early-access`);
    };

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md bg-popover border border-border rounded-2xl shadow-xl p-6 relative">
                <button
                    onClick={() => setVisible(false)}
                    aria-label="Close"
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                {step === 'intro' ? (
                    <>
                        <h2 className="text-lg font-semibold text-popover-foreground mb-3">
                            Channels Early Access
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                            To maintain quality and trust during this early stage in development,
                            we&apos;re now approving channels individually. Your channel{multiple ? 's are' : ' is'} paused
                            until {multiple ? 'they\'re' : 'it\'s'} approved for Early Access, which usually takes
                            less than 48 hours.
                        </p>
                        <p className="text-sm text-muted-foreground mb-6">
                            Apply for Early Access to unpause your channel{multiple ? 's' : ''}!{' '}
                            <a
                                href="https://www.reddit.com/r/Stellicast/s/3XAcliw1zt"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:underline"
                            >
                                Learn more
                            </a>
                        </p>
                        <button
                            onClick={() => {
                                if (channels.length === 1) {
                                    handleSelectChannel(channels[0].handle);
                                } else {
                                    setStep('select');
                                }
                            }}
                            className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground transition cursor-pointer"
                        >
                            Apply for Early Access Now
                        </button>
                    </>
                ) : (
                    <>
                        <h2 className="text-lg font-semibold text-popover-foreground mb-3">
                            Choose a Channel
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Select the channel you&apos;d like to apply with:
                        </p>
                        <div className="space-y-2">
                            {channels.map((channel) => (
                                <button
                                    key={channel.id}
                                    onClick={() => handleSelectChannel(channel.handle)}
                                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition cursor-pointer"
                                >
                                    <p className="text-sm font-medium text-foreground">{channel.display_name}</p>
                                    <p className="text-xs text-muted-foreground">@{channel.handle}</p>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
