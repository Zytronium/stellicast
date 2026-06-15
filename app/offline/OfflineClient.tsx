'use client';

export default function OfflinePage() {
  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.href = '/';
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">You&apos;re Offline</h1>
        <p className="text-gray-400 mb-6">
          Check your internet connection and try again.
        </p>
        <button
          onClick={handleRetry}
          className="px-6 py-3 bg-transparent border-blue-600 border-2 hover:bg-blue-600 rounded-full transition-colors duration-200 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Retry
        </button>
      </div>
    </div>
  );
}