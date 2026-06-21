'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle, XCircle, Plus } from 'lucide-react';

type Application = {
    id: string;
    status: 'pending' | 'accepted' | 'rejected';
    channel_type: 'creator' | 'studio';
    display_name: string;
    handle: string;
    channel_id: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    reviewer_note: string | null;
};

const STATUS_CONFIG = {
    pending: {
        label: 'Pending Review',
        icon: Clock,
        badgeClass: 'bg-warning/15 text-warning-foreground border-warning/30',
    },
    accepted: {
        label: 'Accepted',
        icon: CheckCircle,
        badgeClass: 'bg-success/15 text-success-foreground border-success/30',
    },
    rejected: {
        label: 'Not Approved',
        icon: XCircle,
        badgeClass: 'bg-destructive/15 text-destructive-foreground border-destructive/30',
    },
} as const;

function formatDate(value: string) {
    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export default function ApplicationsClient() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/account/applications');
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to load your applications.');
                }
                const data = await res.json();
                setApplications(data.applications ?? []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Your Applications</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Track the status of your Channels Early Access applications.
                </p>
            </div>

            {error && (
                <p className="text-sm text-destructive-foreground bg-destructive/20 border border-destructive/40 rounded-lg px-4 py-3">
                    {error}
                </p>
            )}

            {applications.length > 0 ? (
                <div className="space-y-3">
                    {applications.map((app) => {
                        const config = STATUS_CONFIG[app.status];
                        const StatusIcon = config.icon;

                        return (
                            <div
                                key={app.id}
                                className="bg-card/50 border border-border rounded-xl p-4 sm:p-5"
                            >
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div>
                                        <h3 className="font-semibold text-card-foreground">{app.display_name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            @{app.handle} &middot; {app.channel_type}
                                        </p>
                                    </div>
                                    <span
                                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${config.badgeClass}`}
                                    >
                                        <StatusIcon className="w-3.5 h-3.5" />
                                        {config.label}
                                    </span>
                                </div>

                                <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                                    <p>Submitted {formatDate(app.submitted_at)}</p>
                                    {app.reviewed_at && <p>Reviewed {formatDate(app.reviewed_at)}</p>}
                                </div>

                                {app.reviewer_note && (
                                    <div className="mt-3 bg-secondary/50 border border-border rounded-lg px-3 py-2.5">
                                        <p className="text-xs font-medium text-foreground mb-1">
                                            Note from the Stellicast team
                                        </p>
                                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {app.reviewer_note}
                                        </p>
                                    </div>
                                )}

                                {app.status === 'accepted' && (
                                    <Link
                                        href={`/channel/${app.handle}`}
                                        className="inline-flex items-center gap-2 mt-3 text-sm text-accent hover:underline"
                                    >
                                        View your channel
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-card/50 border border-border rounded-xl">
                    <p className="text-muted-foreground mb-4">You haven&apos;t submitted any applications yet.</p>
                    <Link
                        href="/channels/apply"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-accent hover:text-accent-foreground transition"
                    >
                        <Plus className="w-4 h-4" />
                        Apply for Early Access
                    </Link>
                </div>
            )}
        </div>
    );
}
