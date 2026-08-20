'use client';
/**
 * PWAInstallPrompt.tsx
 *
 * PURPOSE:
 * Shows a native-style "Add to Home Screen" banner when the app qualifies as
 * installable (i.e. it meets all PWA criteria and has not yet been installed).
 *
 * TWO DIFFERENT INSTALL PATHS:
 *  - Android / Chrome  → the browser fires `beforeinstallprompt`, we intercept it and
 *                        store it, then replay it when the user taps "Install App".
 *  - iOS / Safari      → iOS never fires `beforeinstallprompt`, so instead we detect
 *                        the device via userAgent and show a plain-text instruction card
 *                        telling the user to use the native Share → Add to Home Screen flow.
 *
 * PERIODIC BACKGROUND SYNC:
 * While we're already inside the service-worker context we also try to register a
 * once-per-day background sync job ("daily-story-sync") so the home-screen widget
 * can refresh its content overnight without the user having to open the app.
 *
 * DISMISSAL MEMORY:
 * Once the user taps "Not now" or "×", we write a flag to sessionStorage so the banner
 * won't re-appear for the rest of the browser session. It will return on the next session
 * if the app still isn't installed.
 *
 * Usage:
 *   Place <PWAInstallPrompt /> once inside your root layout — it will render nothing
 *   when no install prompt is available or when the app is already running as a PWA.
 */

import { useEffect, useState } from 'react';

// ── Type augmentation ──────────────────────────────────────────────────────────
// `BeforeInstallPromptEvent` is not in the TypeScript DOM lib yet, so we extend
// the base Event type with the two members we need:
//   .prompt()     — triggers the browser's install dialog
//   .userChoice   — a Promise that resolves once the user accepts or dismisses
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function PWAInstallPrompt() {
  // deferredPrompt — stores the intercepted beforeinstallprompt event so we can
  // trigger it later when the user explicitly clicks "Install App". Null means
  // the event hasn't fired (or the browser doesn't support it).
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // showIOSInstructions — true when we detect an iOS device that isn't in
  // standalone mode yet (so we can show the manual share-sheet instructions).
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // dismissed — true once the user has acted (installed or dismissed). Used to
  // unmount the banner immediately so there's no visual delay.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // ── Guard 1: already running as an installed PWA ─────────────────────────
    // window.matchMedia('(display-mode: standalone)') returns true when the app
    // is launched from the home screen (not in a regular browser tab). If this
    // is true, there's nothing to install, so we bail out immediately.
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // ── Guard 2: user dismissed the prompt earlier this session ──────────────
    // sessionStorage clears when the tab is closed, so the banner will come back
    // on the next session if the user still hasn't installed.
    if (sessionStorage.getItem('pwa_prompt_dismissed')) return;

    // ── Android / Chrome: capture the deferred install prompt ────────────────
    // The browser fires 'beforeinstallprompt' when the app is installable but
    // we call e.preventDefault() to stop it from showing its own mini-infobar.
    // We save the event in state so we can replay it on demand.
    const handler = (e: Event) => {
      e.preventDefault(); // suppress the browser's automatic mini-infobar
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // ── iOS detection ─────────────────────────────────────────────────────────
    // iOS never fires beforeinstallprompt, so we detect it by sniffing userAgent.
    // We also check navigator.standalone (an Apple-specific boolean) to skip
    // the instructions if the user has already added the app to their home screen.
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode =
      ('standalone' in navigator) &&
      (navigator as { standalone?: boolean }).standalone;
    if (isIOS && !isInStandaloneMode) {
      setShowIOSInstructions(true);
    }

    // ── Periodic Background Sync ──────────────────────────────────────────────
    // This optional API lets the service worker wake up in the background once
    // a day to refresh the home-screen widget's data. We wrap it in a feature
    // check because it's only available in some Chromium-based browsers.
    // minInterval is in milliseconds: 86_400_000 ms = 24 hours.
    if (
      'serviceWorker' in navigator &&
      'periodicSync' in (navigator as unknown as { periodicSync: unknown })
    ) {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (reg as any).periodicSync.register('daily-story-sync', {
            minInterval: 86_400_000, // 24 hours in ms
          });
        } catch {
          // Permission denied or quota exceeded — widget falls back to loading
          // fresh data each time the user opens it; not a critical failure.
        }
      });
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────
    // Remove the event listener when the component unmounts so we don't leak
    // memory or accumulate duplicate listeners if the component re-mounts.
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []); // empty dep array → run once on mount

  // ── handleInstall ────────────────────────────────────────────────────────────
  // Called when the user clicks the "Install App" button on Android/Chrome.
  // We replay the deferred prompt, wait for the user's choice, then hide the banner.
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt(); // shows the browser's native install dialog
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      // User tapped "Install" in the browser dialog — clear state and hide banner
      setDeferredPrompt(null);
      setDismissed(true);
    }
    // If dismissed: keep the banner visible so they can try again later
  };

  // ── handleDismiss ─────────────────────────────────────────────────────────────
  // Called when the user taps "Not now" or the "×" close button.
  // We persist the dismissal in sessionStorage and clear all display state.
  const handleDismiss = () => {
    sessionStorage.setItem('pwa_prompt_dismissed', '1'); // suppress for this session
    setDeferredPrompt(null);
    setShowIOSInstructions(false);
    setDismissed(true);
  };

  // ── Early return: nothing to show ────────────────────────────────────────────
  // Render null when: the user has dismissed, OR neither an Android prompt nor iOS
  // instructions are available (e.g. desktop Chrome that already installed, Firefox).
  if (dismissed || (!deferredPrompt && !showIOSInstructions)) return null;

  return (
    // Fixed to the bottom of the viewport, centred, max width sm (~384px).
    // z-50 ensures it appears above overlays, modals, and sticky headers.
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">

          {/* App icon — red skull emoji on a red background to match the horror theme */}
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Add to Home Screen</p>

            {/* ── Platform-specific body copy ───────────────────────────────── */}
            {showIOSInstructions ? (
              // iOS: there is no JS-triggerable prompt, so we guide the user through
              // Safari's native Share sheet manually. The steps are written inline.
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Tap the <strong className="text-white">Share</strong> button in Safari, then{' '}
                <strong className="text-white">Add to Home Screen</strong> for the full app experience.
              </p>
            ) : (
              // Android/Chrome: one-tap install possible via the deferred prompt
              <p className="text-xs text-gray-400 mt-0.5">
                Install for faster reading, offline access, and a home screen widget.
              </p>
            )}

            {/* ── Action buttons — only shown on Android (iOS has no install button) ── */}
            {!showIOSInstructions && (
              <div className="flex gap-2 mt-3">
                {/* Primary CTA — triggers the native install dialog */}
                <button
                  onClick={handleInstall}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Install App
                </button>
                {/* Secondary — closes the banner without installing */}
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 border border-gray-700 text-gray-400 hover:text-white text-xs rounded-lg transition"
                >
                  Not now
                </button>
              </div>
            )}
          </div>

          {/* Universal close button — shown on both Android and iOS banners.
              aria-label provides an accessible name for screen readers. */}
          <button
            onClick={handleDismiss}
            className="text-gray-600 hover:text-gray-300 transition text-lg leading-none flex-shrink-0"
            aria-label="Dismiss install prompt"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
