'use client';
// app/dashboard/bundles/BundleManager.tsx
// Client half of the Author Pro bundle builder — the interactive create form and
// the list of the author's existing bundles.
//
// The parent server component does the Author Pro check and supplies the
// author's own stories, so this component never fetches or decides who may be
// here. All writes go through /api/author/bundles, which re-checks Author Pro
// and story ownership server-side.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Package, Trash2, Plus, Check } from 'lucide-react';

export type AuthorStory = {
  id: number;
  title: string;
  status: string;
};

export type AuthorBundle = {
  id: number;
  title: string;
  slug: string;
  price: number; // cents
  active: boolean;
  items: { story: { id: number; title: string; slug: string } }[];
  _count: { purchases: number };
};

type Props = {
  stories: AuthorStory[];
  bundles: AuthorBundle[];
};

/** Formats a cent amount as a dollar string. */
function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function BundleManager({ stories, bundles }: Props) {
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set to the id of the bundle currently being removed, so only that row's
  // button shows a busy state rather than every row at once.
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const toggleStory = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriceDollars('');
    setSelected([]);
    setError(null);
    setCreating(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Dollars → integer cents. Math.round avoids float drift turning "4.99"
    // into 498.999… and then 498 once truncated.
    const parsed = Math.round(parseFloat(priceDollars) * 100);
    if (!Number.isFinite(parsed) || parsed < 100) {
      setError('Enter a price of at least $1.00.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/author/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          price: parsed,
          storyIds: selected,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not create the bundle.');

      resetForm();
      // Re-render the server component so the new bundle appears without a
      // full page reload and without us duplicating server state here.
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (bundle: AuthorBundle) => {
    // A sold bundle is deactivated rather than deleted, so buyers keep access.
    // Say which will happen before they confirm.
    const sold = bundle._count.purchases > 0;
    const message = sold
      ? `"${bundle.title}" has ${bundle._count.purchases} purchase(s). It will be hidden from the store, but existing buyers keep access. Continue?`
      : `Delete "${bundle.title}"? This cannot be undone.`;
    if (!confirm(message)) return;

    setDeletingId(bundle.id);
    try {
      const res = await fetch('/api/author/bundles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId: bundle.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not remove the bundle.');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDeletingId(null);
    }
  };

  // A bundle needs at least two stories to be worth calling a bundle — the API
  // enforces the same minimum, this just disables the button early.
  const canSubmit = title.trim().length > 0 && selected.length >= 2 && !loading;

  return (
    <>
      {/* ── Existing bundles ──────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-sm font-semibold">Your bundles</h2>
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
              New bundle
            </button>
          )}
        </div>

        {bundles.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 text-center">
            <Package
              className="w-6 h-6 text-gray-700 mx-auto mb-3"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p className="text-sm text-gray-500">
              You haven&apos;t built a bundle yet. Group your stories together and sell them as one
              purchase.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bundles.map((b) => (
              <div
                key={b.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/bundle/${b.slug}`}
                      className="text-sm font-semibold text-white hover:text-amber-300 transition"
                    >
                      {b.title}
                    </Link>
                    <span className="text-xs font-bold text-amber-400">{money(b.price)}</span>
                    {!b.active && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {b.items.length} {b.items.length === 1 ? 'story' : 'stories'}
                    {' · '}
                    {b._count.purchases} {b._count.purchases === 1 ? 'sale' : 'sales'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1.5 truncate">
                    {b.items.map((i) => i.story.title).join(' · ')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(b)}
                  disabled={deletingId === b.id}
                  aria-label={`Remove ${b.title}`}
                  className="shrink-0 p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50 transition"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Create form ───────────────────────────────────────────────────── */}
      {creating && (
        <section className="bg-gray-900 border border-amber-500/25 rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-5">New bundle</h2>

          {stories.length < 2 ? (
            // Guard the empty case explicitly: the form would be unusable, and
            // "select at least 2 stories" is baffling advice when you have none.
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">
                You need at least two published stories before you can bundle them.
              </p>
              <Link
                href="/write"
                className="text-sm text-amber-400 hover:text-amber-300 transition"
              >
                Write another story →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label
                  htmlFor="bundleTitle"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Bundle title
                </label>
                <input
                  id="bundleTitle"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  required
                  placeholder="The Hollow Valley Collection"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                />
              </div>

              <div>
                <label
                  htmlFor="bundleDesc"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Description <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <textarea
                  id="bundleDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="What ties these stories together?"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition resize-y"
                />
              </div>

              <div>
                <label
                  htmlFor="bundlePrice"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Price
                </label>
                <div className="relative max-w-[160px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                    $
                  </span>
                  <input
                    id="bundlePrice"
                    type="number"
                    min="1"
                    step="0.01"
                    inputMode="decimal"
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(e.target.value)}
                    required
                    placeholder="4.99"
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-7 pr-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Minimum $1.00. Buyers get permanent access to every story in the bundle.
                </p>
              </div>

              {/* ── Story picker ──────────────────────────────────────────── */}
              <div>
                <p className="block text-sm font-medium text-gray-300 mb-1.5">
                  Stories{' '}
                  <span className="text-gray-500 font-normal">
                    ({selected.length} selected — pick at least 2)
                  </span>
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-700 divide-y divide-gray-800">
                  {stories.map((s) => {
                    const isOn = selected.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStory(s.id)}
                        aria-pressed={isOn}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                          isOn
                            ? 'bg-amber-500/10 text-white'
                            : 'bg-gray-950 text-gray-400 hover:bg-gray-900'
                        }`}
                      >
                        <span
                          className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                            isOn ? 'bg-amber-500 border-amber-400' : 'border-gray-600'
                          }`}
                        >
                          {isOn && (
                            <Check
                              className="w-3 h-3 text-black"
                              strokeWidth={3}
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        <span className="flex-1 truncate">{s.title}</span>
                        {s.status !== 'PUBLISHED' && (
                          <span className="shrink-0 text-[10px] uppercase tracking-wider text-gray-600">
                            {s.status.toLowerCase()}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? 'Creating…' : 'Create bundle'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </>
  );
}
