'use client';
// app/offline/page.tsx
// Shown when the user opens the app with no internet connection.
// The service worker serves this page from cache when the user is offline.

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function OfflinePage() {
  // Track whether the user has come back online so we can auto-redirect
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Listen for the browser's online/offline events
    const handleOnline = () => setIsOnline(true);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Auto-reload when connection is restored
  useEffect(() => {
    if (isOnline) {
      // Small delay so the "back online" state is visible before reload
      const t = setTimeout(() => window.location.reload(), 1500);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4 text-center">

      {/* Animated skull icon */}
      <div className={`text-8xl mb-6 ${isOnline ? 'animate-bounce' : 'animate-pulse'}`}>
        {isOnline
          ? <Wifi className="w-12 h-12 text-gray-400" strokeWidth={1.25} aria-hidden="true" />
          : <WifiOff className="w-12 h-12 text-gray-500" strokeWidth={1.25} aria-hidden="true" />}
      </div>

      {isOnline ? (
        // Connection restored state
        <>
          <h1 className="text-3xl font-bold text-green-400 mb-3">
            Back from the void!
          </h1>
          <p className="text-gray-400 max-w-sm mb-6">
            Your connection has returned. Reloading the page...
          </p>
          {/* Animated progress bar */}
          <div className="w-48 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full animate-[grow_1.5s_ease-in-out_forwards]" />
          </div>
        </>
      ) : (
        // Offline state
        <>
          <h1 className="text-3xl font-bold text-red-500 mb-3">
            Lost in the Dark
          </h1>

          <p className="text-gray-400 max-w-sm mb-2">
            You have no internet connection. The horrors cannot reach you right now —
            but they will when you reconnect.
          </p>

          <p className="text-gray-600 text-sm mb-8">
            We&apos;ll automatically reload when you&apos;re back online.
          </p>

          {/* Offline tips */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8 max-w-sm text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">While you wait...</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Check that your Wi-Fi or mobile data is turned on
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Try moving to a different location for a better signal
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span>
                Previously visited pages may still be available below
              </li>
            </ul>
          </div>

          {/* Manual retry button */}
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-xl transition-colors"
          >
            Try Again
          </button>
        </>
      )}
    </main>
  );
}
