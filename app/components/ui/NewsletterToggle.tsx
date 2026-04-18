'use client';
// app/components/ui/NewsletterToggle.tsx
// Toggle for opting in/out of the weekly newsletter.
// Shown in the /settings page under the Notifications section.

import { useState } from 'react';

type Props = {
  // Current subscription state loaded server-side from the User model
  initialSubscribed: boolean;
};

export default function NewsletterToggle({ initialSubscribed }: Props) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  const toggle = async () => {
    const next = !subscribed;
    setSaving(true);
    setSaved(false);

    try {
      await fetch('/api/user/newsletter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscribed: next }),
      });
      setSubscribed(next);
      setSaved(true);
      // Clear the "Saved" confirmation after 2 seconds
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 border border-gray-800 rounded-xl px-4 bg-gray-900">
      <div>
        <p className="text-sm font-medium text-white">Weekly Horror Digest</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Top stories of the week, delivered every Monday.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Confirmation pill — flashes briefly after save */}
        {saved && (
          <span className="text-xs text-green-400 font-medium">✓ Saved</span>
        )}

        {/* Toggle switch — same pattern used elsewhere in AccountSettings */}
        <button
          onClick={toggle}
          disabled={saving}
          aria-label={subscribed ? 'Unsubscribe from newsletter' : 'Subscribe to newsletter'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
            subscribed ? 'bg-red-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
              subscribed ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
