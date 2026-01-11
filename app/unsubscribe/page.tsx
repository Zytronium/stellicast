'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Settings, Undo2 } from 'lucide-react';
import Link from 'next/link';

type UnsubscribeType = 'all' | 'promotional' | 'category';

const EMAIL_CATEGORIES = {
  promotional: ['promotional', 'recommendations', 'trending', 'recaps', 'devUpdates', 'announcements'], // all types that could potentially or do definitely qualify legally as promotional or commercial emails
  all: ['promotional', 'recommendations', 'trending', 'recaps', 'devUpdates', 'announcements', 'followedUploads', 'followers']
};

const CATEGORY_LABELS: Record<string, string> = {
  followedUploads: 'Followed Channel Uploads',
  recommendations: 'Occasional Video Recommendations',
  trending: 'Trending Videos',
  recaps: 'Weekly Recaps',
  followers: 'New Followers',
  devUpdates: 'Development Updates',
  announcements: 'Site-wide Announcements',
  promotional: 'Promotional Offers and Deals'
};

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'undone'>('loading');
  const [unsubscribedCategories, setUnsubscribedCategories] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    const processUnsubscribe = async () => {
      const token = searchParams.get('token');
      const type = (searchParams.get('type') || 'all') as UnsubscribeType;
      const category = searchParams.get('category');

      if (!token) {
        setStatus('error');
        setErrorMessage('Invalid unsubscribe link. Please use the link from your email.');
        return;
      }

      try {
        const response = await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, type, category })
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus('error');
          setErrorMessage(data.error || 'Failed to process unsubscribe request.');
          return;
        }

        setUnsubscribedCategories(data.unsubscribed || []);
        setStatus('success');
        setCanUndo(true);

        // Disable undo after 30 seconds
        setTimeout(() => setCanUndo(false), 30000);
      } catch (error) {
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };

    processUnsubscribe();
  }, [searchParams]);

  const handleUndo = async () => {
    const token = searchParams.get('token');
    if (!token) return;

    try {
      const response = await fetch('/api/unsubscribe/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        setStatus('undone');
        setCanUndo(false);
      }
    } catch (error) {
      console.error('Failed to undo unsubscribe:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gradient-to-br from-blue-950/50 to-slate-950/50 border border-zinc-800 rounded-2xl shadow-2xl p-8 md:p-12">
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-block w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h1 className="text-2xl font-semibold text-white mb-2">Processing Request</h1>
            <p className="text-gray-400">Please wait while we process your unsubscribe request...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600/20 rounded-full mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">You've Been Unsubscribed</h1>
            <p className="text-gray-300 mb-8">
              You will no longer receive the following email notifications:
            </p>

            <div className="bg-blue-950/30 border border-blue-800/30 rounded-lg p-6 mb-8 text-left">
              <h2 className="text-lg font-semibold text-white mb-4">Unsubscribed From:</h2>
              <ul className="space-y-2">
                {unsubscribedCategories.map(category => (
                  <li key={category} className="flex items-center gap-2 text-gray-300">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    {CATEGORY_LABELS[category] || category}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-4 mb-8">
              <p className="text-sm text-yellow-200">
                <strong>Note:</strong> You will still receive important security emails about your account,
                                       such as password changes, security alerts, and data breach notifications. These cannot be disabled
                                       for your protection.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {canUndo && (
                <button
                  onClick={handleUndo}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
                >
                  <Undo2 className="w-5 h-5" />
                  Undo Unsubscribe
                </button>
              )}
              <Link
                href="/settings"
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" />
                Manage All Preferences
              </Link>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              Changed your mind? You can re-enable these notifications anytime in your settings.
            </p>
          </div>
        )}

        {status === 'undone' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600/20 rounded-full mb-6">
              <CheckCircle className="w-12 h-12 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Preferences Restored</h1>
            <p className="text-gray-300 mb-8">
              Your email preferences have been restored. You'll continue receiving the emails you were subscribed to.
            </p>

            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              <Settings className="w-5 h-5" />
              Manage Preferences
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600/20 rounded-full mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Something Went Wrong</h1>
            <p className="text-gray-300 mb-8">{errorMessage}</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/settings"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" />
                Go to Settings
              </Link>
              <Link
                href="/"
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition"
              >
                Return Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
