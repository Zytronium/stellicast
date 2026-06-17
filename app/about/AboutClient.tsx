'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import VideoPlayer from "@/components/VideoPlayer";
import Image from "next/image";

interface FundsData {
  "funds_spent": number;
  "profit_earned": number;
  "number_donations": number;
  "last_updated": number;
}

interface FAQ {
  q: string;
  a: string | React.ReactNode;
}

// Hook for scroll-triggered animations
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
        { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, inView } = useInView();
  return (
      <section
          ref={ref}
          className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      >
        {children}
      </section>
  );
}

const comparisonRows = [
  { label: 'Established creator base',    yt: true, sc: false, ytNote: "", scNote: "Stellicast is in early development and not ready for this yet, but with your help, it can change!"  },
  { label: 'Production-ready',            yt: true, sc: false, ytNote: "Users note the website can be extremely buggy.", scNote: "Stellicast is in early development, but is usable."  },
  { label: 'Ad-free paid tier',           yt: true,  sc: true, ytNote: "YT Premium Lite removes some but not all ads; YT Premium removes all ads from videos.", scNote: "Paid tier not implemented yet. Ads are also not implemented yet."  },
  { label: 'AI content labeling',         yt: true,  sc: true, ytNote: "YouTube only started requiring this recently.", scNote: ""  },
  { label: 'Does NOT sell your data',     yt: false, sc: true, ytNote: "", scNote: ""  },
  { label: 'No third-party trackers',     yt: false, sc: true, ytNote: "", scNote: ""  },
  { label: 'No targeted ads',             yt: false, sc: true, ytNote: "", scNote: ""  },
  { label: 'Watch history stays private', yt: false, sc: true, ytNote: "", scNote: ""  },
  { label: 'Open source',                 yt: false, sc: true, ytNote: "", scNote: ""  },
  { label: 'Human-led moderation',        yt: false, sc: true, ytNote: "", scNote: "Moderation is a team of 1 until mods can be hired."  },
  { label: 'Creator-first algorithm',     yt: false, sc: true, ytNote: "", scNote: "Algorithm is still in development."  },
  { label: 'No mid-roll interruptions',   yt: false, sc: true, ytNote: "", scNote: "This will be false when ads are implemented."  },
  { label: 'Multiple color themes',       yt: false, sc: true, ytNote: "", scNote: ""  },
  { label: 'Will exist after the robot uprising takes over the world', yt: false, sc: false, ytNote: "Will probably assist in the coming of the robot uprising when it happens", scNote: ""  },
];

const faqs: FAQ[] = [
  {
    q: 'Is it free?',
    a: 'Yes, Stellicast is free to use. There may be an optional premium tier in the future with perks like ad-free viewing, but the core experience will always be free.',
  },
  {
    q: 'Will it stay ad-free?',
    a: "Most likely not forever, but ads here will be nothing like what you're used to. One optional skippable ad per 20-30 minutes on long videos, never 2–3 unskippable ads back-to-back every few minutes. Paid tiers will be completely ad-free. If you're bracing for YouTube-style ad fatigue, that simply will never happen here.",
  },
  {
    q: 'Can I import my YouTube channel?',
    a: "Not yet. Channel migration is on the radar as a possoble future feature, but it's an extremely complex thing to build correctly, so no promises. When it happens, it'll be done right.",
  },
  {
    q: 'Is Stellicast really open source?',
    a: 'Yes, the full codebase is publicly available on GitHub. You can read every line, report issues, or contribute directly. Transparency is a core value, not a marketing claim.',
  },
  {
    q: 'Who runs Stellicast?',
    a: (
        <>
          Stellicast is independently developed by a developer known as &quot;<a href="https://zytronium.dev/"
                                                                                 target="_blank"
                                                                                 rel="noopener noreferrer"
                                                                                 className="text-primary hover:underline">Zytronium</a>.&quot; No
          corporate parent, no VC money. It&apos;s funded by donations and built by people who actually care about what
          video platforms could be.
        </>
    ),
  },
];

export default function AboutPage() {
  const [fundsData, setFundsData] = useState<FundsData>();
  const [fundsLoading, setFundsLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    fetch('https://zytronium.github.io/stellicast_data_api/funds.json')
        .then(res => res.json())
        .then(data => { setFundsData(data); setFundsLoading(false); })
        .catch(() => setFundsLoading(false));
  }, []);

  const handleInfoEnter = (e: React.MouseEvent, text: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top + window.scrollY });
  };

  return (
      <div className="flex flex-col items-center overflow-x-hidden">
        {tooltip && createPortal(
          <div
            className="pointer-events-none fixed z-[9999] w-52 rounded-lg bg-popover border border-border shadow-lg px-3 py-2 text-xs text-popover-foreground text-left leading-relaxed"
            style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
          >
            {tooltip.text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
          </div>,
          document.body
        )}

        {/* ── Hero ── */}
        <section className="w-full max-w-5xl py-20 px-6 text-center animate-fade-in-up">
          <div className="w-auto h-24 -mt-12 mb-24">
            <Image src="/stellicast.png" alt="Stellicast" width={2997} height={512} priority />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent p-1.5">
            Watch without being watched.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Stellicast is a privacy-first, community-driven video platform built to be the YouTube alternative we&apos;ve all been waiting for. No tracking. No corporate bloat. Just content.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/auth" className="px-8 py-4 bg-primary hover:bg-accent text-primary-foreground rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-primary/20">
              Join Us Today
            </Link>
            <Link href="/" className="px-8 py-4 bg-card border border-border hover:border-primary/50 transition-all rounded-full font-bold">
              Explore the Feed
            </Link>
          </div>
        </section>

        {/* ── The Problem ── */}
        <Section className="w-full bg-card/40 border-y border-border py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4 text-center">The Problem</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-foreground mb-6">
              Video platforms forgot who they work for.
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-14 leading-relaxed">
              Somewhere along the way, the biggest platforms stopped serving viewers and creators. They serve advertisers. Your attention is the product, your data is the inventory, and your experience is negotiable.
            </p>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              {[
                { label: 'Surveillance by default', body: "Every click, pause, rewind, like, and search is logged and sold. You are the product, not the customer." },
                { label: 'Ads as punishment', body: "Two to three unskippable ads before a 30-second video. Mid-rolls every few minutes. Ads that follow you across the internet afterward." },
                { label: 'Creators as content farms', body: "The algorithm demands a posting schedule. It punishes originality that doesn't fit a trend. It buries small creators under brand-sponsored content." },
              ].map(({ label, body }) => (
                  <div key={label} className="p-6 rounded-2xl bg-background/60 border border-border">
                    <div className="w-2 h-2 rounded-full bg-destructive mb-4" />
                    <h3 className="font-bold text-card-foreground mb-2">{label}</h3>
                    <p className="text-muted-foreground leading-relaxed">{body}</p>
                  </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Privacy Comparison ── */}
        <Section className="w-full py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4 text-center">Privacy</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-foreground mb-4">
              Stellicast vs. YouTube
            </h2>
            <p className="text-muted-foreground text-center mb-12">The same idea. A very different relationship with your data.</p>
            <div className="rounded-2xl border border-border overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-3 bg-card/80 border-b border-border text-sm font-semibold">
                <div className="px-5 py-4 text-muted-foreground" />
                <div className="px-5 py-4 text-center text-muted-foreground border-l border-border">YouTube</div>
                <div className="px-5 py-4 text-center text-primary border-l border-border">Stellicast</div>
              </div>
              {/* Rows */}
              {comparisonRows.map(({ label, yt, sc, ytNote, scNote }, i) => (
                  <div key={label} className={`grid grid-cols-3 text-sm border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-background/30' : 'bg-card/20'}`}>
                    <div className="px-5 py-4 text-card-foreground">{label}</div>
                    <div className="px-5 py-4 text-center border-l border-border">
                      <div className="relative inline-flex items-start justify-center">
                        {yt
                            ? <span className="text-success font-bold">✓</span>
                            : <span className="text-destructive font-bold">✕</span>}
                        {ytNote && (
                            <div className="absolute -top-1.5 -right-3.5">
                              <span
                                  onMouseEnter={(e) => handleInfoEnter(e, ytNote)}
                                  onMouseLeave={() => setTooltip(null)}
                                  className="text-muted-foreground hover:text-foreground transition-colors cursor-default"
                                  aria-label={`Note about YouTube: ${ytNote}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                  <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
                                </svg>
                              </span>
                            </div>
                        )}
                      </div>
                    </div>
                    <div className="px-5 py-4 text-center border-l border-border">
                      <div className="relative inline-flex items-start justify-center">
                        {sc
                            ? <span className="text-success font-bold">✓</span>
                            : <span className="text-destructive font-bold">✕</span>}
                        {scNote && (
                            <div className="absolute -top-1.5 -right-3.5">
                              <span
                                  onMouseEnter={(e) => handleInfoEnter(e, scNote)}
                                  onMouseLeave={() => setTooltip(null)}
                                  className="text-muted-foreground hover:text-foreground transition-colors cursor-default"
                                  aria-label={`Note about Stellicast: ${scNote}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                  <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
                                </svg>
                              </span>
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Sectors ── */}
        <Section className="w-full bg-primary/5 border-y border-border py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4 text-center">Community</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-foreground mb-4">Sectors, not categories</h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-14 leading-relaxed">
              YouTube has categories. Stellicast has Sectors, communities with their own rules, members, and identity. Think of them like subreddits, but for video.
            </p>
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="space-y-5">
                {[
                  { title: 'Community-governed', body: 'Each Sector sets its own posting rules, content constraints, and culture. No one-size-fits-all moderation. (Platform rules always apply too.)' },
                  { title: 'Opt-in membership', body: 'Join the Sectors that matter to you. Your feed reflects your actual interests, not what an algorithm guesses.' },
                  { title: 'Private or public', body: 'Sectors can be listed on the Star Map for anyone to discover, or kept private and invite-only.' },
                  { title: 'Curated constraints', body: 'Sector admins can restrict AI content, set minimum and maximum video lengths, or require approval before posts go live.' },
                ].map(({ title, body }) => (
                    <div key={title} className="flex gap-4">
                      <div className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      <div>
                        <h4 className="font-bold text-card-foreground mb-1">{title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                      </div>
                    </div>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-card/60 p-7 space-y-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-5">Example Sectors</p>
                {[
                  { slug: 's/science',   label: 'Science & Technology', desc: 'No AI-generated content. Min 30 seconds.' },
                  { slug: 's/rc_planes', label: 'RC Planes',            desc: 'Stellicast founder\'s favorite place. No AI content.' },
                  { slug: 's/gaming',    label: 'Gaming',               desc: 'Open posting. Min 15 seconds, max 4 hours.' },
                  { slug: 's/space',     label: 'Space',                desc: 'Approval required. No AI content. Max 12 hours.' },
                ].map(({ slug, label, desc }) => (
                    <div key={slug} className="flex items-center gap-4 p-3 rounded-xl bg-background/50 border border-border/60">
                      <Link href={`/${slug}`} className="text-xs font-mono text-primary shrink-0 hover:underline">{slug}</Link>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-card-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground truncate">{desc}</p>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Creators vs Studios ── */}
        <Section className="w-full py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4 text-center">The Creator Advantage</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-center text-foreground mb-4">
              Creators first. Studios second.
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-14 leading-relaxed">
              Stellicast separates channels into two types. Creators are independent individuals and nonprofits making content for the love of it. Studios are brands and for-profit operations. By default, Creators are promoted above Studios. You can change this preference if you want.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Creators */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wide">Creator</span>
                  <span className="text-xs text-muted-foreground">Independent · Prioritized</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Deep Humor. A 14-year-old's shitposting channel. A solo science communicator. A nonprofit documentary team. Someone who just loves making things. These channels are what made early video platforms worth watching.
                </p>
                <ul className="space-y-2 text-sm text-card-foreground">
                  {[
                    'Boosted in default feeds and recommendations',
                    'Higher revenue share than Studios',
                    'Human-made content promoted above AI-generated',
                    'Fair, human-reviewed moderation and copyright claims',
                  ].map(item => (
                      <li key={item} className="flex gap-2 items-start">
                        <span className="text-primary mt-0.5">✓</span>
                        {item}
                      </li>
                  ))}
                </ul>
              </div>

              {/* Studios */}
              <div className="rounded-2xl border border-border bg-card/40 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold uppercase tracking-wide">Studio</span>
                  <span className="text-xs text-muted-foreground">Brand · Still welcome</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Mr. Beast. The Onion. Minecraft's official channel. For-profit brands and media companies are welcome on Stellicast, they're just not given priority over the independent creators who built the culture.
                </p>
                <ul className="space-y-2 text-sm text-card-foreground">
                  {[
                    'Full access to upload and monetize',
                    'Standard recommendation weighting',
                    'Clearly labeled as a Studio channel',
                    'Subject to the same community rules as everyone else',
                  ].map(item => (
                      <li key={item} className="flex gap-2 items-start">
                        <span className="text-muted-foreground mt-0.5">–</span>
                        {item}
                      </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Open Source ── */}
        <Section className="w-full bg-card/40 border-y border-border py-24 px-6">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Open Source</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-5">
                Don&apos;t trust us. Read the code.
              </h2>
              <p className="text-muted-foreground mb-5 leading-relaxed">
                Stellicast is fully open source. Every privacy claim on this page is backed by real code you can read, audit, fork, or contribute to. No black boxes. No hidden data pipelines. No "trust us."
              </p>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Found a bug? Open an issue. Want a feature? Submit a PR. Think something could be done better? Tell us. This platform is built in public, and it always will be.
              </p>
              <a
                  href="https://github.com/zytronium/stellicast"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-card border border-border hover:border-primary/50 text-card-foreground font-semibold text-sm transition-all hover:scale-105"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>
            <div className="w-full md:w-64 rounded-2xl border border-border bg-background/60 p-6 font-mono text-xs text-muted-foreground space-y-1.5 flex-shrink-0">
              <p className="text-primary mb-3">{'// What we don\'t do'}</p>
              <p><span className="text-destructive">✕</span> sell(userData)</p>
              <p><span className="text-destructive">✕</span> share(watchHistory)</p>
              <p><span className="text-destructive">✕</span> track(everything)</p>
              <p><span className="text-destructive">✕</span> shadowBan(creators)</p>
              <p className="pt-3 text-primary">{'// What we do'}</p>
              <p><span className="text-success">✓</span> serve(content)</p>
              <p><span className="text-success">✓</span> protect(privacy)</p>
              <p><span className="text-success">✓</span> prioritize(creators)</p>
              <p><span className="text-success">✓</span> buildInPublic()</p>
            </div>
          </div>
        </Section>

        {/* ── Sample Video ── */}
        <Section className="w-full max-w-4xl mx-auto py-24 px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4 text-center">Experience</p>
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">See the player in action</h2>
          <VideoPlayer video={{
            id: "4759f71a-f92c-4971-b036-db43783f0696",
            title: "Sample Video",
            creator: "Creator Name",
            description: "Stellicast Video Player Demo Example",
            thumbnail: "/StellicastPlaceholderThumbnail.png",
            src: "https://vz-a7106f64-493.b-cdn.net/4759f71a-f92c-4971-b036-db43783f0696/playlist.m3u8"
          }} />
        </Section>

        {/* ── FAQ ── */}
        <Section className="w-full bg-card/40 border-y border-border py-24 px-6">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4 text-center">FAQ</p>
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">Common questions</h2>
            <div className="space-y-3">
              {faqs.map(({ q, a }, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background/40 overflow-hidden">
                    <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between px-6 py-5 text-left text-card-foreground font-semibold text-sm hover:bg-card/40 transition-colors"
                        aria-expanded={openFaq === i}
                    >
                      <span>{q}</span>
                      <span className={`ml-4 shrink-0 text-primary transition-transform duration-300 ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === i ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Support / Donate ── */}
        <Section className="w-full py-24 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Support</p>
            <h2 className="text-3xl font-bold mb-4 text-foreground">Keep the lights on</h2>
            <p className="text-muted-foreground mb-10 leading-relaxed">
              Stellicast has no investors and runs no surveillance ads. Server costs, moderation tools, and development are funded entirely by people who believe in what this platform is trying to be.
            </p>

            {!fundsLoading && fundsData && (
                <div className="mb-10 grid grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-card/60 border border-border">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Spent</p>
                    <p className="text-2xl font-bold text-destructive-foreground">${fundsData.funds_spent.toFixed(2)}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card/60 border border-border">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Donated</p>
                    <p className="text-2xl font-bold text-success-foreground">${fundsData.profit_earned.toFixed(2)}</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-card/60 border border-border">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Donors</p>
                    <p className="text-2xl font-bold text-primary">{fundsData.number_donations}</p>
                  </div>
                  <p className="col-span-3 text-xs text-muted-foreground">
                    Last updated {new Date(fundsData.last_updated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
            )}

            <a
                href="https://www.buymeacoffee.com/zytronium"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-7 py-4 rounded-full font-extrabold text-black bg-gradient-to-r from-cyan-300 to-sky-400 shadow-lg shadow-cyan-500/30 transition-all duration-300 hover:scale-105 hover:shadow-cyan-400/50 focus:outline-none focus:ring-4 focus:ring-cyan-300/40 active:scale-95"
            >
              <span className="text-2xl">💵</span>
              <span className="text-lg tracking-wide">Support Development</span>
            </a>
          </div>
        </Section>

        {/* ── CTA ── */}
        <section className="py-32 px-6 text-center w-full">
          <h2 className="text-4xl font-bold mb-4 text-foreground">Ready for a better experience?</h2>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto">
            Stellicast is in early development. The people who join now are the ones who shape what it becomes.
          </p>
          <Link
              href="/auth"
              className="inline-flex items-center justify-center px-10 py-5 bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground rounded-full font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-primary/20"
          >
            Get Started Today
          </Link>
        </section>

      </div>
  );
}
