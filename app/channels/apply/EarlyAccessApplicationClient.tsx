'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle } from 'lucide-react';

// -------- types --------

type ContentReadiness = 'ready' | 'working' | 'planning' | 'no-plans' | '';

type ChannelType = 'creator' | 'studio';

interface ApplicationForm {
    // -------- application fields --------
    contentType: string;
    uploadFrequency: string;
    contentReadiness: ContentReadiness;
    whyStellicast: string;
    otherPlatforms: string;
    howHeard: string;
    agreedToTerms: boolean;

    // -------- channel creation fields --------
    channelType: ChannelType;
    displayName: string;
    handle: string;
    description: string;
    website: string;
    companyName: string;
    businessEmail: string;
}

const INITIAL_FORM: ApplicationForm = {
    contentType: '',
    uploadFrequency: '',
    contentReadiness: '',
    whyStellicast: '',
    otherPlatforms: '',
    howHeard: '',
    agreedToTerms: false,
    channelType: 'creator',
    displayName: '',
    handle: '',
    description: '',
    website: '',
    companyName: '',
    businessEmail: '',
};

// -------- shared input class --------
const inputClass =
    'w-full bg-input border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring';

const textareaClass =
    'w-full bg-input border border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring resize-none';

export default function EarlyAccessApplicationClient() {
    const router = useRouter();
    const [form, setForm] = useState<ApplicationForm>(INITIAL_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const set = (field: keyof ApplicationForm) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    // -------- validation --------
    const validate = (): string => {
        if (!form.contentType.trim()) return 'Please describe the type of content you plan to upload.';
        if (!form.uploadFrequency.trim()) return 'Please tell us how frequently you plan to upload.';
        if (!form.contentReadiness) return 'Please select whether you have content ready to upload.';
        if (!form.otherPlatforms.trim()) return 'Please fill in the other platforms field (enter "No" if not applicable).';
        if (!form.howHeard.trim()) return 'Please tell us how you heard about Stellicast.';
        if (!form.agreedToTerms) return 'You must read and agree to the Channel Early Access Agreement to apply.';
        if (!form.displayName.trim()) return 'Please enter a display name for your channel.';
        if (!form.handle.trim()) return 'Please enter a handle for your channel.';
        if (form.channelType === 'studio' && !form.companyName.trim()) return 'Company name is required for studio channels.';
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
                    // channel fields
                    channel_type: form.channelType,
                    display_name: form.displayName,
                    handle: form.handle.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                    description: form.description || null,
                    website: form.website || null,
                    company_name: form.companyName || null,
                    business_email: form.businessEmail || null,
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

            {/* -------- section: channel setup -------- */}
            <section className="bg-card/50 border border-border rounded-xl p-5 sm:p-6 space-y-5">
                <div>
                    <h2 className="text-base font-semibold text-foreground">Channel Setup</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Your channel will be created and made active once your application is accepted.
                    </p>
                </div>

                {/* Channel type */}
                <div>
                    <label className="block text-sm font-medium mb-2 text-foreground">Channel Type *</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, channelType: 'creator' }))}
                            className={`p-3 sm:p-4 rounded-xl border-2 text-left transition ${
                                form.channelType === 'creator'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-muted'
                            }`}
                        >
                            <p className="font-semibold text-sm text-foreground">Creator</p>
                            <p className="text-xs text-muted-foreground mt-0.5">For individual content creators</p>
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, channelType: 'studio' }))}
                            className={`p-3 sm:p-4 rounded-xl border-2 text-left transition ${
                                form.channelType === 'studio'
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-muted'
                            }`}
                        >
                            <p className="font-semibold text-sm text-foreground">Studio</p>
                            <p className="text-xs text-muted-foreground mt-0.5">For production companies &amp; teams</p>
                        </button>
                    </div>
                </div>

                {/* Display name */}
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Display Name *</label>
                    <input
                        type="text"
                        value={form.displayName}
                        onChange={set('displayName')}
                        placeholder="My Awesome Channel"
                        className={inputClass}
                    />
                </div>

                {/* Handle */}
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Handle *</label>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">@</span>
                        <input
                            type="text"
                            value={form.handle}
                            onChange={(e) =>
                                setForm(prev => ({
                                    ...prev,
                                    handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                                }))
                            }
                            placeholder="mychannel"
                            className={inputClass}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Only lowercase letters, numbers, and underscores</p>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Description</label>
                    <textarea
                        value={form.description}
                        onChange={set('description')}
                        placeholder="Tell viewers about your channel..."
                        rows={3}
                        className={textareaClass}
                    />
                </div>

                {/* Creator-specific */}
                {form.channelType === 'creator' && (
                    <div>
                        <label className="block text-sm font-medium mb-1.5 text-foreground">Website</label>
                        <input
                            type="url"
                            value={form.website}
                            onChange={set('website')}
                            placeholder="https://example.com"
                            className={inputClass}
                        />
                    </div>
                )}

                {/* Studio-specific */}
                {form.channelType === 'studio' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-foreground">Company Name *</label>
                            <input
                                type="text"
                                value={form.companyName}
                                onChange={set('companyName')}
                                placeholder="Acme Studios Inc."
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-foreground">Business Email</label>
                            <input
                                type="email"
                                value={form.businessEmail}
                                onChange={set('businessEmail')}
                                placeholder="contact@company.com"
                                className={inputClass}
                            />
                        </div>
                    </>
                )}
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
