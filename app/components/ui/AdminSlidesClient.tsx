'use client';
// ============================================================
// FILE: AdminSlidesClient.tsx
// PURPOSE: Admin panel for managing the homepage slideshow.
//          Admins can add new slides (with image upload), toggle each slide
//          active/inactive, and delete slides.
//
// KEY CONCEPT — Hidden file input + styled trigger button:
//   Native <input type="file"> looks ugly and can't be styled with CSS.
//   The solution used here is to hide the real input with className="hidden",
//   store a ref to it, and then programmatically call .click() on it when
//   the user clicks a nicely-styled button. This is a very common pattern.
//
// KEY CONCEPT — Image upload flow:
//   1. User picks a file → handleImageUpload fires
//   2. We build a FormData object and POST it to /api/Slide/upload
//   3. The server saves the file and returns a public URL
//   4. We store that URL in form.image so it's sent with the slide data
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Copy the hidden-input + ref pattern for any file upload field.
//   - The Field helper component at the bottom is a reusable labeled input
//     — copy it to your own project to avoid repeating label+input markup.
//   - router.refresh() after mutations keeps the list in sync with the DB
//     without a full page reload.
// ============================================================

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Shape of a single slideshow slide from the database
type Slide = {
  id: number;
  title: string;
  subtitle: string | null; // optional tagline shown under the title
  image: string; // public URL of the slide image
  linkUrl: string | null; // optional URL the slide links to when clicked
  order: number; // lower numbers appear first
  active: boolean; // false = hidden from the public slideshow
};

export default function AdminSlidesClient({ slides }: { slides: Slide[] }) {
  // router.refresh() re-runs the server component to fetch updated slide data
  const router = useRouter();

  // loading stores the ID of the slide being acted on (disables its buttons)
  const [loading, setLoading] = useState<number | null>(null);

  // form — controlled values for the "Add Slide" form fields
  const [form, setForm] = useState({ title: '', subtitle: '', image: '', linkUrl: '', order: '' });

  // adding — true while the POST /api/Slide request is in flight
  const [adding, setAdding] = useState(false);

  // showForm — toggles the Add Slide form panel on/off
  const [showForm, setShowForm] = useState(false);

  // uploading — true while the image file is being sent to the server
  const [uploading, setUploading] = useState(false);

  // uploadError — shown below the image picker if the upload fails
  const [uploadError, setUploadError] = useState('');

  // fileInputRef — a direct reference to the hidden <input type="file"> element.
  // We use this to programmatically trigger the browser's file picker dialog.
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleActive = async (slide: Slide) => {
    setLoading(slide.id);
    await fetch(`/api/Slide/${slide.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !slide.active }),
    });
    setLoading(null);
    router.refresh();
  };

  const deleteSlide = async (id: number, title: string) => {
    if (!confirm(`Delete slide "${title}"?`)) return;
    setLoading(id);
    await fetch(`/api/Slide/${id}`, { method: 'DELETE' });
    setLoading(null);
    router.refresh();
  };

  // Called when the user picks a file — uploads it and stores the returned URL in form.image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);

    const data = new FormData();
    data.append('file', file);

    const res = await fetch('/api/Slide/upload', { method: 'POST', body: data });
    const json = await res.json();

    setUploading(false);

    if (!res.ok) {
      // Show the server error message if upload fails
      setUploadError(json.error ?? 'Upload failed.');
      return;
    }

    // Store the returned public URL so the slide POST sends a real path
    setForm((prev) => ({ ...prev, image: json.url }));
  };

  const addSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    await fetch('/api/Slide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        subtitle: form.subtitle || null,
        image: form.image,
        linkUrl: form.linkUrl || null,
        order: Number(form.order) || 0,
      }),
    });
    setAdding(false);
    setForm({ title: '', subtitle: '', image: '', linkUrl: '', order: '' });
    // Reset the file input so the user can pick the same file again next time
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowForm(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* ── Add slide button ──────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ Add Slide'}
        </button>
      </div>

      {/* ── Add slide form ────────────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={addSlide}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-semibold text-white">New Slide</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Title *"
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
              placeholder="Slide title"
              required
            />
            <Field
              label="Subtitle"
              value={form.subtitle}
              onChange={(v) => setForm({ ...form, subtitle: v })}
              placeholder="Optional tagline"
            />
            {/* Image picker — hidden file input triggered by a styled button */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Image *</label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageUpload}
              />

              {/* Visible pick-file button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-left text-gray-400 hover:border-gray-500 disabled:opacity-50 transition"
              >
                {uploading
                  ? 'Uploading…'
                  : form.image
                    ? '✓ Image chosen — click to change'
                    : 'Choose image from device…'}
              </button>

              {/* Upload error message */}
              {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
            </div>
            <Field
              label="Link URL"
              value={form.linkUrl}
              onChange={(v) => setForm({ ...form, linkUrl: v })}
              placeholder="https://..."
            />
            <Field
              label="Order"
              value={form.order}
              onChange={(v) => setForm({ ...form, order: v })}
              placeholder="0"
              type="number"
            />
          </div>

          {/* Image preview */}
          {form.image && (
            <div className="relative w-full h-40 overflow-hidden rounded-lg border border-gray-700">
              <Image src={form.image} alt="preview" fill sizes="100vw" className="object-cover" />
            </div>
          )}

          <button
            type="submit"
            disabled={adding}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {adding ? 'Adding...' : 'Add Slide'}
          </button>
        </form>
      )}

      {/* ── Slides list ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        {slides.map((slide) => (
          <div
            key={slide.id}
            className={`bg-gray-900 border rounded-xl p-4 flex items-center gap-4 transition ${
              slide.active ? 'border-gray-800' : 'border-gray-800 opacity-50'
            }`}
          >
            {/* Thumbnail */}
            <Image
              src={slide.image}
              alt={slide.title}
              width={96}
              height={56}
              className="object-cover rounded-lg shrink-0 border border-gray-700"
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{slide.title}</p>
              {slide.subtitle && (
                <p className="text-gray-500 text-xs mt-0.5 truncate">{slide.subtitle}</p>
              )}
              <p className="text-gray-600 text-xs mt-1">Order: {slide.order}</p>
            </div>

            {/* Active badge */}
            <span
              className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                slide.active
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'bg-gray-500/10 text-gray-500 border-gray-600/30'
              }`}
            >
              {slide.active ? 'Active' : 'Hidden'}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => toggleActive(slide)}
                disabled={loading === slide.id}
                className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 transition"
              >
                {slide.active ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={() => deleteSlide(slide.id, slide.title)}
                disabled={loading === slide.id}
                className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple reusable input field
function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
      />
    </div>
  );
}
