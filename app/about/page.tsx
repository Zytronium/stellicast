'use client';

import Link from 'next/link';
import {
  ShieldCheckIcon,
  NoSymbolIcon,
  UserGroupIcon,
  FlagIcon,
  CpuChipIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

export default function AboutPage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full max-w-5xl py-20 px-6 text-center animate-fade-in-up">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
          The YouTube alternative we&apos;re still waiting for
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Stellicast is a privacy-first, community-driven video platform built to be the alternative we&apos;ve all been waiting for. No tracking. No corporate bloat. Just content.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/auth" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-blue-500/20">
            Join Us Today
          </Link>
          <Link href="/" className="px-8 py-4 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-full font-bold transition-all">
            Explore the Feed
          </Link>
        </div>
      </section>

      {/* Core Values Grid */}
      <section className="w-full max-w-7xl py-20 px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-3xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/50 transition-colors group">
          <ShieldCheckIcon className="w-12 h-12 text-blue-500 mb-6 group-hover:animate-float" />
          <h3 className="text-xl font-bold mb-4">Privacy First</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Zero third-party trackers. No selling your data to advertisers. We believe your watch history is your business, not ours. Not even advertisers can track your activity.
          </p>
        </div>
        <div className="p-8 rounded-3xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/50 transition-colors group">
          <NoSymbolIcon className="w-12 h-12 text-blue-500 mb-6 group-hover:animate-float" />
          <h3 className="text-xl font-bold mb-4">Ad-Lite Experience</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Max 1 skippable ad per 30 minutes. No ads on short videos. Every ad is manually reviewed by humans to ensure quality and child safety, unlike YouTube.
          </p>
        </div>
        <div className="p-8 rounded-3xl bg-gray-900/50 border border-gray-800 hover:border-blue-500/50 transition-colors group">
          <UserGroupIcon className="w-12 h-12 text-blue-500 mb-6 group-hover:animate-float" />
          <h3 className="text-xl font-bold mb-4">Community Focused</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            We prioritize real people, separating personal and commercial channels into &quot;Creators&quot; and &quot;Studios.&quot; Our algorithm favors Creators over Studios by default, bringing back the personal feel of early video platforms.
          </p>
        </div>
      </section>

      {/* The Difference Section */}
      <section className="w-full bg-gray-900/30 py-24 border-y border-gray-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Human-Centric AI Policy</h2>
            <p className="text-gray-400">Innovation without exploitation.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CpuChipIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Full AI Disclosure</h4>
                  <p className="text-sm text-gray-400">All AI-generated content must be labeled. Transparency isn&apos;t optional.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FlagIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Human-Led Moderation</h4>
                  <p className="text-sm text-gray-400">AI assists, but humans decide. No more automated bans without appeal.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-bold mb-1">Incentivizing Humanity</h4>
                  <p className="text-sm text-gray-400">Human-made content is promoted more and receives a higher revenue share.</p>
                </div>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-gray-900 border border-gray-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold mb-4">The Creator Advantage</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Fair copyright claim process
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Zero tracking-based algorithms
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Direct migration tools from other platforms
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    Creator content promoted over Studio content by default
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Footer */}
      <section className="py-32 px-6 text-center">
        <h2 className="text-4xl font-bold mb-8">Ready for a better experience?</h2>
        <Link
          href="/auth"
          className="inline-flex items-center justify-center px-10 py-5 bg-white text-black hover:bg-gray-200 rounded-full font-bold text-lg transition-transform hover:scale-105"
        >
          Get Started Today
        </Link>
        <p className="mt-8 text-gray-500 text-sm">
          Stellicast is currently in early development. Join us in shaping the future.
        </p>
      </section>
    </div>
  );
}