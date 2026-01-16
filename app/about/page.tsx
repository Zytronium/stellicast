'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  NoSymbolIcon,
  UserGroupIcon,
  FlagIcon,
  CpuChipIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import VideoPlayer from "@/components/VideoPlayer";

interface FundsData {
  "funds_spent": number;
  "profit_earned": number;
  "number_donations": number;
  "last_updated": number;
}

export default function AboutPage() {
  const [fundsData, setFundsData] = useState<FundsData>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://zytronium.github.io/stellicast_data_api/funds.json')
      .then(res => res.json())
      .then(data => {
        setFundsData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch funds data:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-5xl py-20 px-6 text-center animate-fade-in-up">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          The YouTube alternative we&apos;re still waiting for
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Stellicast is a privacy-first, community-driven video platform built to be the alternative we&apos;ve all been waiting for. No tracking. No corporate bloat. Just content.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/auth" className="px-8 py-4 bg-primary hover:bg-accent text-primary-foreground rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-primary/20">
            Join Us Today
          </Link>
          <Link href="/" className="px-8 py-4 bg-card border border-border hover:border-muted transition-all rounded-full font-bold">
            Explore the Feed
          </Link>
        </div>
      </section>

      {/* Core Values Grid */}
      <section className="w-full max-w-7xl py-20 px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-3xl bg-card/50 border border-border hover:border-primary/50 transition-colors group">
          <ShieldCheckIcon className="w-12 h-12 text-primary mb-6 group-hover:animate-float" />
          <h3 className="text-xl font-bold mb-4 text-card-foreground">Privacy First</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Zero third-party trackers. No selling your data to advertisers. We believe your watch history is your business, not ours. Not even advertisers can track your activity.
          </p>
        </div>
        <div className="p-8 rounded-3xl bg-card/50 border border-border hover:border-primary/50 transition-colors group">
          <NoSymbolIcon className="w-12 h-12 text-primary mb-6 group-hover:animate-float" />
          <h3 className="text-xl font-bold mb-4 text-card-foreground">Ad-Lite Experience</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Max 1 skippable ad per 30 minutes. No ads on short videos. Every ad is manually reviewed by humans to ensure quality and child safety, unlike YouTube.
          </p>
        </div>
        <div className="p-8 rounded-3xl bg-card/50 border border-border hover:border-primary/50 transition-colors group">
          <UserGroupIcon className="w-12 h-12 text-primary mb-6 group-hover:animate-float" />
          <h3 className="text-xl font-bold mb-4 text-card-foreground">Community Focused</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We prioritize real people, separating personal and commercial channels into &quot;Creators&quot; and &quot;Studios.&quot; Our algorithm favors Creators over Studios by default, bringing back the personal feel of early video platforms.
          </p>
        </div>
      </section>

      {/* The Difference Section */}
      <section className="w-full bg-card/30 py-24 border-y border-border rounded-2xl">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-foreground">Human-Centric AI Policy</h2>
            <p className="text-muted-foreground">Innovation without exploitation.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CpuChipIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold mb-1 text-card-foreground">Full AI Disclosure</h4>
                  <p className="text-sm text-muted-foreground">All AI-generated content must be labeled. Transparency isn&apos;t optional.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FlagIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold mb-1 text-card-foreground">Human-Led Moderation</h4>
                  <p className="text-sm text-muted-foreground">AI assists, but humans decide. No more automated bans without appeal.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold mb-1 text-card-foreground">Incentivizing Humanity</h4>
                  <p className="text-sm text-muted-foreground">Human-made content is promoted more and receives a higher revenue share.</p>
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-card border border-border p-8 rounded-2xl">
                <h3 className="text-xl font-bold mb-4 text-card-foreground">The Creator Advantage</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Fair copyright claim process
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Zero tracking-based algorithms
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Direct migration tools from other platforms
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Creator content promoted over Studio content by default
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sample Video Section */}
      <section className="w-full max-w-4xl mx-auto py-24 px-6">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          Sample the Video Experience</h2>
        <div className="mx-auto">
          <VideoPlayer video={{
            id: "4759f71a-f92c-4971-b036-db43783f0696",
            title: "Sample Video",
            creator: "Creator Name",
            description: "Stellicast Video Player Demo Example",
            thumbnail: "/StellicastPlaceholderThumbnail.png",
            src: "https://vz-a7106f64-493.b-cdn.net/4759f71a-f92c-4971-b036-db43783f0696/playlist.m3u8"
          }}
          />
        </div>
      </section>

      {/* Donations Section */}
      <section className="w-full max-w-5xl mx-auto py-6 px-6 text-center">
        <h2 className="text-3xl font-bold mb-6 text-foreground">Support Stellicast</h2>
        <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
          Stellicast is independently developed. Donations help cover infrastructure,
          moderation tools, and continued development.
        </p>

        {!loading && fundsData && (
          <div className="mb-10 p-6 rounded-2xl bg-card/50 border border-border max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Funds Spent</p>
                <p className="text-2xl font-bold text-red-400">${fundsData.funds_spent.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Profit Earned</p>
                <p className="text-2xl font-bold text-green-400">${fundsData.profit_earned.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Donations</p>
                <p className="text-2xl font-bold text-blue-400">{fundsData.number_donations}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(fundsData.last_updated).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            </p>
          </div>
        )}

        <a
          href="https://www.buymeacoffee.com/zytronium"
          target="_blank"
          rel="noopener noreferrer"
          className="
    inline-flex items-center gap-3
    px-6 py-3
    rounded-full
    font-extrabold
    text-black
    bg-gradient-to-r from-cyan-300 to-sky-400
    shadow-lg shadow-cyan-500/30
    transition-all duration-300
    hover:scale-105
    hover:shadow-cyan-400/50
    focus:outline-none focus:ring-4 focus:ring-cyan-300/40
    active:scale-95
  ">
          <span className="text-2xl">💵</span>
          <span className="text-lg tracking-wide">Support Development</span>
        </a>
      </section>

      {/* CTA / Footer */}
      <section className="py-32 px-6 text-center">
        <h2 className="text-4xl font-bold mb-8 text-foreground">Ready for a better experience?</h2>
        <Link
          href="/auth"
          className="inline-flex items-center justify-center px-10 py-5 bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground rounded-full font-bold text-lg transition-transform hover:scale-105"
        >
          Get Started Today
        </Link>
        <p className="mt-8 text-muted-foreground text-sm">
          Stellicast is currently in early development. Join us in shaping the future.
        </p>
      </section>
    </div>
  );
}
