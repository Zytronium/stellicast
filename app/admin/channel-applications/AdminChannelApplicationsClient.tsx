'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

// -------- types --------

type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

interface Application {
    id: string;
    user_id: string;
    status: ApplicationStatus;
    content_type: string;
    upload_frequency: string;
    content_readiness: string;
    why_stellicast: string | null;
    other_platforms: string;
    how_heard: string;
    agreed_to_terms: boolean;
    channel_type: 'creator' | 'studio';
    display_name: string;
    handle: string;
    description: string | null;
    website: string | null;
    company_name: string | null;
    business_email: string | null;
    reviewed_at: string | null;
    reviewer_note: string | null;
    submitted_at: string;
    users: {
        username: string;
        display_name: string | null;
        avatar_url: string | null;
    } | null;
}

type DecisionModal = {
    application: Application;
    action: 'approve' | 'reject';
} | null;

const STATUS_TABS: { key: ApplicationStatus; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'rejected', label: 'Rejected' },
];

const READINESS_LABELS: Record<string, string> = {
    ready: 'Content is ready to upload',
    working: 'Currently working on content',
    planning: 'Still in the planning stage',
    'no-plans': 'No content planned yet',
};

export default function AdminChannelApplicationsClient() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [channelCount, setChannelCount] = useState(0);
    const [channelCap, setChannelCap] = useState(30);
    const [statusFilter, setStatusFilter] = useState<ApplicationStatus>('pending');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [decisionModal, setDecisionModal] = useState<DecisionModal>(null);
    const [decisionNote, setDecisionNote] = useState('');
    const [submittingDecision, setSubmittingDecision] = useState(false);

    // -------- fetch applications --------
    const fetchApplications = async (status: ApplicationStatus) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/admin/channel-applications?status=${status}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load applications.');
            setApplications(data.applications);
            setChannelCount(data.channel_count);
            setChannelCap(data.channel_cap);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications(statusFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    // -------- submit approve/reject decision --------
    const submitDecision = async () => {
        if (!decisionModal) return;
        setSubmittingDecision(true);
        try {
            const res = await fetch(`/api/admin/channel-applications/${decisionModal.application.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: decisionModal.action,
                    note: decisionNote || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to submit decision.');

            setDecisionModal(null);
            setDecisionNote('');
            await fetchApplications(statusFilter);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmittingDecision(false);
        }
    };

    const atCap = channelCount >= channelCap;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

            {/* -------- header -------- */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold text-foreground">Channel Early Access Applications</h1>
                <div
                    className={`text-sm px-3 py-1.5 rounded-lg border ${
                        atCap
                            ? 'border-destructive/40 bg-destructive/20 text-destructive-foreground'
                            : 'border-border bg-card/50 text-muted-foreground'
                    }`}
                >
                    {channelCount}/{channelCap} channels used
                    {atCap && ' - cap reached'}
                </div>
            </div>

            {/* -------- status tabs -------- */}
            <div className="flex gap-2 border-b border-border">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                            statusFilter === tab.key
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {error && (
                <p className="text-sm text-destructive-foreground bg-destructive/20 border border-destructive/40 rounded-lg px-4 py-3">
                    {error}
                </p>
            )}

            {/* -------- loading state -------- */}
            {loading && (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
            )}

            {/* -------- empty state -------- */}
            {!loading && applications.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-16">
                    No {statusFilter} applications.
                </p>
            )}

            {/* -------- application list -------- */}
            {!loading && applications.map((app) => {
                const isExpanded = expandedId === app.id;
                return (
                    <div key={app.id} className="bg-card/50 border border-border rounded-xl overflow-hidden">

                        {/* -------- summary row -------- */}
                        <button
                            onClick={() => setExpandedId(isExpanded ? null : app.id)}
                            className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left"
                        >
                            <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">
                                    {app.display_name} <span className="text-muted-foreground font-normal">@{app.handle}</span>
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {app.channel_type === 'studio' ? 'Studio' : 'Creator'} · Applicant: {app.users?.username ?? app.user_id}
                                    {' · '}
                                    Submitted {new Date(app.submitted_at).toLocaleDateString()}
                                </p>
                            </div>
                            {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                            )}
                        </button>

                        {/* -------- expanded detail -------- */}
                        {isExpanded && (
                            <div className="border-t border-border p-4 sm:p-5 space-y-4">

                                {/* -------- application Q&A -------- */}
                                <div className="space-y-3">
                                    <QA question="What type of content do you plan to upload?" answer={app.content_type} />
                                    <QA question="How frequently do you plan to upload?" answer={app.upload_frequency} />
                                    <QA question="Content readiness" answer={READINESS_LABELS[app.content_readiness] ?? app.content_readiness} />
                                    <QA question="Why do you want to use Stellicast?" answer={app.why_stellicast} />
                                    <QA question="What other platforms do you use?" answer={app.other_platforms} />
                                    <QA question="How did you hear about Stellicast?" answer={app.how_heard} />
                                </div>

                                {/* -------- channel setup --------- */}
                                <div className="space-y-3 pt-3 border-t border-border">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Channel Setup</p>
                                    <QA question="Channel type" answer={app.channel_type === 'studio' ? 'Studio' : 'Creator'} />
                                    <QA question="Display name" answer={app.display_name} />
                                    <QA question="Handle" answer={`@${app.handle}`} />
                                    <QA question="Description" answer={app.description} />
                                    {app.channel_type === 'creator' && (
                                        <QA question="Website" answer={app.website} />
                                    )}
                                    {app.channel_type === 'studio' && (
                                        <>
                                            <QA question="Company name" answer={app.company_name} />
                                            <QA question="Business email" answer={app.business_email} />
                                        </>
                                    )}
                                </div>

                                {/* -------- review metadata for already-reviewed applications -------- */}
                                {app.status !== 'pending' && (
                                    <div className="space-y-3 pt-3 border-t border-border">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Review</p>
                                        <QA
                                            question="Reviewed at"
                                            answer={app.reviewed_at ? new Date(app.reviewed_at).toLocaleString() : null}
                                        />
                                        <QA question="Reviewer note" answer={app.reviewer_note} />
                                    </div>
                                )}

                                {/* -------- decision buttons -------- */}
                                {app.status === 'pending' && (
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => setDecisionModal({ application: app, action: 'approve' })}
                                            disabled={atCap}
                                            className="flex items-center gap-2 px-4 py-2 bg-success text-success-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => setDecisionModal({ application: app, action: 'reject' })}
                                            className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-white text-sm font-medium rounded-lg hover:opacity-90 transition"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                    </div>
                                )}
                                {app.status === 'pending' && atCap && (
                                    <p className="text-xs text-muted-foreground">
                                        Channel cap reached. Reject or free up a slot before approving more.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* -------- decision modal -------- */}
            {decisionModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
                    <div className="bg-card border border-border rounded-xl max-w-md w-full p-5 sm:p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-foreground">
                            {decisionModal.action === 'approve' ? 'Approve' : 'Reject'} application
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {decisionModal.action === 'approve'
                                ? `This will create the channel @${decisionModal.application.handle} and notify the applicant.`
                                : 'This will notify the applicant that their application was not accepted.'}
                        </p>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-foreground">
                                Note to applicant (optional)
                            </label>
                            <textarea
                                value={decisionNote}
                                onChange={(e) => setDecisionNote(e.target.value)}
                                placeholder="Shown to the applicant in their notification email..."
                                rows={3}
                                className="w-full bg-input border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring resize-none"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-1">
                            <button
                                onClick={() => {
                                    setDecisionModal(null);
                                    setDecisionNote('');
                                }}
                                disabled={submittingDecision}
                                className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted/20 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitDecision}
                                disabled={submittingDecision}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 ${
                                    decisionModal.action === 'approve'
                                        ? 'bg-success text-success-foreground hover:opacity-90'
                                        : 'bg-destructive text-destructive-foreground hover:opacity-90'
                                }`}
                            >
                                {submittingDecision
                                    ? 'Submitting...'
                                    : decisionModal.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// -------- small question/answer display helper --------
function QA({ question, answer }: { question: string; answer: string | null }) {
    return (
        <div>
            <p className="text-xs font-medium text-muted-foreground">{question}</p>
            <p className="text-sm text-foreground whitespace-pre-wrap mt-0.5">
                {answer && answer.trim() ? answer : <span className="text-muted-foreground italic">Not provided</span>}
            </p>
        </div>
    );
}
