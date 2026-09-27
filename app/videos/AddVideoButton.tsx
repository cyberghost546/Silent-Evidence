'use client';
// app/videos/AddVideoButton.tsx
//
// WHY 'use client'?
//   The modal open/close toggle and multi-step form state all require useState —
//   these can only run in Client Components.
//
// PURPOSE:
//   A 2-step modal for community members to add a video story to the site.
//   Step 1 — URL validation and thumbnail preview.
//   Step 2 — Story metadata (title, description, category) and submit.
//
// 2-STEP FLOW:
//   The URL step comes first so the user can see a thumbnail preview and
//   confirm the video is correct before filling in metadata. `handleNext()`
//   validates the URL and advances; the Back button returns to Step 1.
//
// isValidVideoUrl():
//   Accepts YouTube (youtu.be, youtube.com, www.youtube.com) or direct video
//   file URLs ending in .mp4, .webm, or .ogg. Invalid URLs return false and
//   show an inline error rather than advancing to Step 2.
//
// getYouTubeThumbnail():
//   Extracts the video ID from YouTube URLs to build an img.youtube.com
//   thumbnail URL (hqdefault.jpg). Shows a live preview in Step 1 so the
//   user can verify the right video was pasted. Returns null for non-YouTube
//   URLs (direct video files get no preview).
//
// SUBMIT STRATEGY:
//   `handleSubmit()` POSTs to `/api/stories` — the same endpoint used for
//   text stories — with `videoUrl` set and `status: 'PUBLISHED'`. This reuses
//   the existing story creation API rather than needing a separate video route.
//   The `content` field is required by the API schema, so it falls back to the
//   title when no description is provided.
//
// window.location.reload() vs router.refresh():
//   A full page reload is used after a successful submit to guarantee the new
//   video appears in the grid. This is simpler than router.refresh() + modal
//   close sequencing and avoids any stale-data edge cases.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Category = { id: number; name: string; slug: string };

function getYouTubeThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === 'youtu.be') id = u.pathname.slice(1).split('?')[0];
    else if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      const shorts = u.pathname.match(/^\/shorts\/([^/]+)/);
      if (shorts) id = shorts[1];
    }
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}

function isValidVideoUrl(url: string) {
  try {
    const u = new URL(url);
    const isYT = ['youtu.be', 'www.youtube.com', 'youtube.com'].includes(u.hostname);
    const isDirect = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
    return isYT || isDirect;
  } catch {
    return false;
  }
}

export default function AddVideoButton({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [videoUrl, setVideoUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  // Step 2 fields
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const thumb = getYouTubeThumbnail(videoUrl);

  function reset() {
    setOpen(false);
    setStep(1);
    setVideoUrl('');
    setUrlError('');
    setTitle('');
    setExcerpt('');
    setCategoryId(categories[0]?.id ?? 0);
    setError('');
  }

  function handleNext() {
    if (!isValidVideoUrl(videoUrl.trim())) {
      setUrlError('Please enter a valid YouTube or direct video URL.');
      return;
    }
    setUrlError('');
    setStep(2);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: excerpt.trim() || title.trim(), // content is required by API
          excerpt: excerpt.trim(),
          videoUrl: videoUrl.trim(),
          categoryId,
          status: 'PUBLISHED',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }

      // Refresh server data and close the modal
      reset();
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-red-600/20"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Video
      </button>

      {/* Modal backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div>
                <h2 className="text-white font-bold text-lg">Add a Video</h2>
                <p className="text-xs text-gray-500 mt-0.5">Step {step} of 2</p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="text-gray-500 hover:text-white transition p-1"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* ── Step 1: URL ── */}
              {step === 1 && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                      YouTube or Video URL
                    </label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => {
                        setVideoUrl(e.target.value);
                        setUrlError('');
                      }}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full bg-gray-800 border border-gray-700 focus:border-red-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition placeholder-gray-600"
                    />
                    {urlError && <p className="text-red-400 text-xs mt-2">{urlError}</p>}
                  </div>

                  {/* Thumbnail preview */}
                  {videoUrl && isValidVideoUrl(videoUrl) && thumb && (
                    <div className="rounded-xl overflow-hidden border border-gray-800">
                      <div
                        className="relative w-full"
                        style={{ maxHeight: '192px', aspectRatio: '16/9' }}
                      >
                        <Image
                          src={thumb}
                          alt="Preview"
                          fill
                          sizes="(max-width: 640px) 100vw, 512px"
                          className="object-cover"
                        />
                      </div>
                      <p className="text-xs text-gray-500 px-3 py-2">
                        Preview looks good? Continue to add details.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition"
                  >
                    Continue →
                  </button>
                </>
              )}

              {/* ── Step 2: Story details ── */}
              {step === 2 && (
                <>
                  {/* Thumbnail small preview */}
                  {thumb && (
                    <div className="flex gap-3 items-center bg-gray-800 rounded-xl p-3">
                      <Image
                        src={thumb}
                        alt="thumb"
                        width={80}
                        height={48}
                        className="object-cover rounded-lg shrink-0"
                      />
                      <p className="text-xs text-gray-400 truncate">{videoUrl}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your video a title…"
                      maxLength={200}
                      className="w-full bg-gray-800 border border-gray-700 focus:border-red-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition placeholder-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                      Description <span className="text-gray-600">(optional)</span>
                    </label>
                    <textarea
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      placeholder="Short description of the video…"
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 focus:border-red-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition placeholder-gray-600 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(Number(e.target.value))}
                      className="w-full bg-gray-800 border border-gray-700 focus:border-red-500 rounded-xl px-4 py-3 text-white text-sm outline-none transition"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-xl transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                    >
                      {submitting ? 'Publishing…' : 'Publish Video'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
