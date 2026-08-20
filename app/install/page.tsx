// app/install/page.tsx
// Step-by-step instructions for installing Silent Evidence as a home screen app.
// Linked from the footer and settings page.
// Covers Android (Chrome) + iOS (Safari) + Desktop (Chrome/Edge).

import type { Metadata } from 'next';
import { Smartphone, Apple, Laptop, Zap, Download, CalendarDays } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Install the App | Silent Evidence',
  description: 'Add Silent Evidence to your home screen for the full app experience.',
};

// Each platform section with numbered steps
const platforms = [
  {
    name: 'Android (Chrome)',
    icon: Smartphone,
    steps: [
      'Open Silent Evidence in Chrome.',
      'Tap the three-dot menu (⋮) in the top-right corner.',
      'Tap "Add to Home Screen".',
      'Confirm by tapping "Add" on the dialog.',
      'The app icon will appear on your home screen.',
    ],
    tip: 'You can also look for the install banner that appears at the bottom of the screen automatically.',
  },
  {
    name: 'iPhone / iPad (Safari)',
    icon: Apple,
    steps: [
      'Open Silent Evidence in Safari (not Chrome).',
      'Tap the Share button (the box with an arrow ↑) at the bottom of the screen.',
      'Scroll down in the share sheet and tap "Add to Home Screen".',
      'Edit the name if you like, then tap "Add" in the top-right.',
      'The app icon will appear on your home screen.',
    ],
    tip: 'Must use Safari — other iOS browsers cannot install PWAs.',
  },
  {
    name: 'Desktop (Chrome / Edge)',
    icon: Laptop,
    steps: [
      'Open Silent Evidence in Chrome or Edge.',
      'Click the install icon (⊕) in the address bar on the right side.',
      'Click "Install" on the dialog that appears.',
      'The app opens in its own window without browser chrome.',
    ],
    tip: 'You can also find the install option in the browser menu → "Save and Share" → "Install page as app".',
  },
];

export default function InstallPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Install Silent Evidence</h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-md mx-auto">
          Add the app to your home screen for faster loading, offline reading,
          and a daily horror story widget.
        </p>
      </div>

      {/* Benefits row */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
  { icon: Zap,          label: 'Faster loading' },
  { icon: Download,     label: 'Offline reads' },
  { icon: CalendarDays, label: 'Daily widget' },
        ].map(b => (
          <div key={b.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <div className="flex justify-center mb-1"><b.icon className="w-6 h-6 text-gray-400" strokeWidth={1.5} aria-hidden="true" /></div>
            <p className="text-xs text-gray-400">{b.label}</p>
          </div>
        ))}
      </div>

      {/* Platform instructions */}
      <div className="space-y-6">
        {platforms.map(platform => (
          <div key={platform.name} className="border border-gray-800 rounded-xl p-5 bg-gray-900">
            {/* Platform header */}
            <div className="flex items-center gap-2 mb-4">
              <platform.icon className="w-6 h-6 shrink-0 text-gray-400" strokeWidth={1.5} aria-hidden="true" />
              <h2 className="text-base font-bold text-white">{platform.name}</h2>
            </div>

            {/* Steps */}
            <ol className="space-y-2">
              {platform.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  {/* Step number */}
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            {/* Pro tip */}
            <p className="mt-4 text-xs text-gray-500 bg-gray-800 rounded-lg px-3 py-2 leading-relaxed">
 {platform.tip}
            </p>
          </div>
        ))}
      </div>

      {/* Widget instructions */}
      <div className="mt-8 border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-5">
        <h3 className="text-sm font-bold text-yellow-400 mb-2">Daily Story Widget</h3>
        <p className="text-xs text-gray-400 leading-relaxed mb-3">
          Once the app is installed, you can add a web widget to your home screen
          that shows today&apos;s featured horror story.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong className="text-gray-400">Android:</strong> Long-press your home screen → Widgets → search for your browser → pick a medium widget → set URL to{' '}
          <code className="text-yellow-400 bg-gray-900 px-1 rounded">silentevidence.com/widget</code>
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-1">
          <strong className="text-gray-400">iOS (Scriptable / WWDC):</strong> Use the Scriptable app with a web widget script pointing to{' '}
          <code className="text-yellow-400 bg-gray-900 px-1 rounded">/api/widget/daily-story</code>{' '}
          (returns JSON) to build a native widget.
        </p>
      </div>
    </main>
  );
}
