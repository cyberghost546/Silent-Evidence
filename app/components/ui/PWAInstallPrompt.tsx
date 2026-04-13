'use client';
// app/components/ui/PWAInstallPrompt.tsx
// Shows a native-style "Add to Home Screen" banner when the app is installable.
// Handles both the browser's beforeinstallprompt event (Android/Chrome)
// and a manual instructions banner for iOS (where the prompt isn't available).
// Also registers a Periodic Background Sync so the daily widget updates automatically.

import { useEffect, useState } from 'react';

// The browser fires this event when the app is installable
// (meets PWA criteria and hasn't been installed yet)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PWAInstallPrompt() {
  // Stored deferred install prompt (Android/Chrome only)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Don't show if user already dismissed it in this session
    if (sessionStorage.getItem('pwa_prompt_dismissed')) return;

    // ── Android / Chrome: listen for beforeinstallprompt ──────────────────────
    const handler = (e: Event) => {
      e.preventDefault(); // prevent the browser's default mini-infobar
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // ── iOS detection: show manual instructions ────────────────────────────────
    // iOS doesn't fire beforeinstallprompt — we detect it via userAgent
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in navigator) && (navigator as { standalone?: boolean }).standalone;
    if (isIOS && !isInStandaloneMode) {
      setShowIOSInstructions(true);
    }

    // ── Periodic Background Sync — keeps the daily widget fresh ───────────────
    // Requests permission to sync in the background once a day
    if ('serviceWorker' in navigator && 'periodicSync' in (navigator as unknown as { periodicSync: unknown })) {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          // Minimum interval: 1 day (86400 seconds)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (reg as any).periodicSync.register('daily-story-sync', { minInterval: 86_400_000 });
        } catch {
          // Permission not granted — widget will just load fresh data on open
        }
      });
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    // Remember the dismissal for this session so it doesn't keep popping up
    sessionStorage.setItem('pwa_prompt_dismissed', '1');
    setDeferredPrompt(null);
    setShowIOSInstructions(false);
    setDismissed(true);
  };

  // Nothing to show
  if (dismissed || (!deferredPrompt && !showIOSInstructions)) return null;

  return (
    // Fixed bottom banner — similar to cookie banners but for install
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-lg">☠</span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Add to Home Screen</p>

            {showIOSInstructions ? (
              // iOS: manual steps (no prompt available)
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Tap the <strong className="text-white">Share</strong> button in Safari, then{' '}
                <strong className="text-white">Add to Home Screen</strong> for the full app experience.
              </p>
            ) : (
              // Android/Chrome: one-tap install
              <p className="text-xs text-gray-400 mt-0.5">
                Install for faster reading, offline access, and a home screen widget.
              </p>
            )}

            {/* Action buttons */}
            {!showIOSInstructions && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 border border-gray-700 text-gray-400 hover:text-white text-xs rounded-lg transition"
                >
                  Not now
                </button>
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="text-gray-600 hover:text-gray-300 transition text-lg leading-none flex-shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
