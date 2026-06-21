'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle } from 'lucide-react';

// -------- types --------

type ContentReadiness = 'ready' | 'working' | 'planning' | 'no-plans' | '';

interface ApplicationForm {
    // -------- application fields --------
    contentType: string;
    uploadFrequency: string;
    contentReadiness: ContentReadiness;
    whyStellicast: string;
    otherPlatforms: string;
    howHeard: string;
    agreedToTerms: boolean;
}

const INITIAL_FORM: ApplicationForm = {
    contentType: '',
    uploadFrequency: '',
    contentReadiness: '',
    whyStellicast: '',
    otherPlatforms: '',
    howHeard: '',
    agreedToTerms: false,
};

// -------- shared input class --------
const inputClass =
    'w-full bg-input border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring';

const textareaClass =
    'w-full bg-input border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring resize-none';

export default function EarlyAccessApplicationClient() {
    const router = useRouter();

    // -------- channel handle, pulled from the route (/channel/[id]/early-access - the "id" segment is the handle) --------
    const routeParams = useParams<{ id?: string | string[] }>();
    const channelHandle = Array.isArray(routeParams?.id)
        ? routeParams.id[0] ?? ''
        : routeParams?.id ?? '';

    const [form, setForm] = useState<ApplicationForm>(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const set = (field: keyof ApplicationForm) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    // -------- validation --------
    const validate = (): string => {
        if (!channelHandle) return 'Could not determine which channel this application is for. Please go back and try again.';
        if (!form.contentType.trim()) return 'Please describe the type of content you plan to upload.';
        if (!form.uploadFrequency.trim()) return 'Please tell us how frequently you plan to upload.';
        if (!form.contentReadiness) return 'Please select whether you have content ready to upload.';
        if (!form.otherPlatforms.trim()) return 'Please fill in the other platforms field (enter "No" if not applicable).';
        if (!form.howHeard.trim()) return 'Please tell us how you heard about Stellicast.';
        if (!form.agreedToTerms) return 'You must read and agree to the Channel Early Access Agreement to apply.';
        return '';
    };

    // -------- submit --------
    const handleSubmit = async () => {
        setError('');
        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/channels/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // application fields
                    content_type: form.contentType,
                    upload_frequency: form.uploadFrequency,
                    content_readiness: form.contentReadiness,
                    why_stellicast: form.whyStellicast || null,
                    other_platforms: form.otherPlatforms,
                    how_heard: form.howHeard,
                    agreed_to_terms: form.agreedToTerms,
                    // link to the existing channel instead of creating a new one
                    channel_handle: channelHandle,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit application.');
            }

            setSubmitted(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // -------- success state --------
    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-16 text-center">
                <div className="flex justify-center mb-6">
                    <CheckCircle className="w-16 h-16 text-success" />
                </div>
                <h1 className="text-2xl font-semibold text-foreground mb-3">Application Submitted!</h1>
                <p className="text-muted-foreground mb-2">
                    Thanks for applying for Channels Early Access. We&apos;ll review your application and get back to you via email.
                </p>
                <p className="text-sm text-muted-foreground mb-8">
                    In the meantime, you can browse Stellicast as usual.
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="px-6 py-2.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-accent hover:text-accent-foreground transition"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

            {/* -------- banner -------- */}
            <div className="rounded-xl overflow-hidden border border-border">
                <Image
                    src="/early_access_banner.png"
                    alt="Channels Early Access"
                    width={800}
                    height={300}
                    className="w-full object-cover"
                    priority
                />
            </div>

            {/* -------- intro -------- */}
            <div>
                <h1 className="text-2xl font-semibold text-foreground mb-2">Apply for Channels Early Access</h1>
                <p className="text-sm text-muted-foreground">
                    Channels are currently in Early Access. Fill out this application and we&apos;ll review it shortly.
                    Most applications are accepted, we just want to know a bit about you and what you plan to upload.
                </p>
                {channelHandle && (
                    <p className="text-sm text-muted-foreground mt-3">
                        This application is for your existing channel.
                    </p>
                )}
            </div>

            {/* -------- section: about your content -------- */}
            <section className="bg-card/50 border border-border rounded-xl p-5 sm:p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground">About Your Content</h2>

                {/* Content type */}
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                        What type of content do you plan to upload? *
                    </label>
                    <textarea
                        value={form.contentType}
                        onChange={set('contentType')}
                        placeholder="e.g. gaming videos, tech tutorials, vlogs, music..."
                        rows={3}
                        className={textareaClass}
                    />
                </div>

                {/* Upload frequency */}
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                        How frequently do you plan to upload? *
                    </label>
                    <input
                        type="text"
                        value={form.uploadFrequency}
                        onChange={set('uploadFrequency')}
                        placeholder="e.g. once a week, a few times a month..."
                        className={inputClass}
                    />
                </div>

                {/* Content readiness */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">
                        Do you have content ready to upload, or are you still planning? *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {([
                            { value: 'ready', label: 'Ready to upload', sub: 'I have content ready to go' },
                            { value: 'working', label: 'Working on it', sub: 'I\'m creating content that will be ready soon' },
                            { value: 'planning', label: 'Still planning', sub: 'I\'m working on content ideas' },
                            { value: 'no-plans', label: 'No plans yet', sub: 'I don\'t know what I plan to upload yet' },
                        ] as const).map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setForm(prev => ({ ...prev, contentReadiness: opt.value }))}
                                className={`p-3 rounded-xl border-2 text-left transition ${
                                    form.contentReadiness === opt.value
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-muted'
                                }`}
                            >
                                <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Other platforms */}
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                        Have you uploaded video content to other platforms before? If so, which ones? *
                    </label>
                    <input
                        type="text"
                        value={form.otherPlatforms}
                        onChange={set('otherPlatforms')}
                        placeholder="e.g. YouTube, TikTok, Twitch; or 'No'"
                        className={inputClass}
                    />
                </div>

                {/* Why Stellicast */}
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                        Why do you want to upload to Stellicast instead of (or in addition to) other platforms?{' '}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <textarea
                        value={form.whyStellicast}
                        onChange={set('whyStellicast')}
                        placeholder="We'd love to know what brought you here..."
                        rows={3}
                        className={textareaClass}
                    />
                </div>

                {/* How heard */}
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">
                        How did you hear about Stellicast? *
                    </label>
                    <textarea
                        value={form.howHeard}
                        onChange={set('howHeard')}
                        placeholder="e.g. a friend, Reddit, Discord, just stumbled upon it..."
                        rows={2}
                        className={textareaClass}
                    />
                </div>
            </section>

            {/* -------- agreement & submit -------- */}
            <section className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={form.agreedToTerms}
                        onChange={(e) => setForm(prev => ({ ...prev, agreedToTerms: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                    />
                    <span className="text-sm text-foreground leading-relaxed">
                        I have read the{' '}
                        <a
                            href="/channel-early-access-agreement"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline"
                        >
                            Channel Early Access Agreement
                        </a>{' '}
                        and agree to follow platform rules. *
                    </span>
                </label>

                {error && (
                    <p className="text-sm text-destructive-foreground bg-destructive/20 border border-destructive/40 rounded-lg px-4 py-3">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-3 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground disabled:bg-muted disabled:text-muted-foreground transition cursor-pointer disabled:cursor-default"
                >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                </button>

                <p className="text-xs text-center text-muted-foreground">
                    Most applications are accepted. We review to ensure quality and platform health.
                </p>
            </section>
        </div>
    );
}
