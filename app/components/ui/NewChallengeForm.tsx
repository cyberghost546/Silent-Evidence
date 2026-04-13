'use client';
// app/components/ui/NewChallengeForm.tsx
// Admin form to create a new writing challenge.
// Submits to POST /api/challenges and then redirects to /admin/challenges.
//
// Fields:
//   • Title       (required) — a short headline for the challenge
//   • Description (optional) — longer context shown to participants
//   • Prompt      (required) — the specific writing scenario participants must write to
//   • Start Date  (required) — ISO datetime when the challenge opens
//   • End Date    (required) — ISO datetime when the challenge closes
//   • Active      (toggle)   — whether the challenge is currently visible to users

import { useState } from 'react';           // useState — manages form field values, saving flag, and error
import { useRouter } from 'next/navigation'; // useRouter — used to navigate to /admin/challenges after creation

export default function NewChallengeForm() {
  // router — Next.js router; we call router.push() after a successful creation
  const router = useRouter();

  // saving — true while the POST request is in-flight; disables the submit button
  const [saving, setSaving] = useState(false);

  // error — holds a validation or API error message to display above the form
  const [error, setError] = useState('');

  // form — a single state object holding all field values.
  // Using one object instead of individual useState calls keeps updates consistent.
  const [form, setForm] = useState({
    title:       '',      // challenge headline
    description: '',      // optional longer explanation
    prompt:      '',      // the writing scenario
    startDate:   '',      // ISO datetime string from the date-time input
    endDate:     '',      // ISO datetime string from the date-time input
    active:      true,    // new challenges default to active/visible
  });

  // set — helper that updates a single field in the form object.
  // Accepts a field name and its new value; spreads existing state and overrides the one field.
  const set = (field: string, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  // handleSubmit — validates required fields, then POSTs to /api/challenges.
  // On success: redirects to the admin challenges list.
  // On failure: shows the API error message.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();  // prevent the browser from reloading the page

    setError(''); // clear any previous error before re-validating

    // Client-side validation — check that all required fields have a value
    if (!form.title || !form.prompt || !form.startDate || !form.endDate) {
      setError('Title, prompt, start date, and end date are required.');
      return; // stop here; show the error and let the user fix it
    }

    setSaving(true); // show "Creating…" label and disable the button

    // POST the challenge data to the server API route
    const res = await fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form), // send all form fields as JSON
    });

    const data = await res.json(); // parse the response body

    setSaving(false); // re-enable the button

    if (!res.ok) {
      // API returned an error — show it inline and stay on the form
      setError(data.error ?? 'Something went wrong.');
      return;
    }

    // Success — navigate the admin back to the challenges list
    router.push('/admin/challenges');
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    // Column layout with gaps between each field group
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Inline error banner — only shown when error state is non-empty */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* ── Title field ───────────────────────────────────────────────────── */}
      <div>
        {/* Label with red asterisk to mark it as required */}
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Challenge Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={e => set('title', e.target.value)} // update title field on every keystroke
          placeholder="e.g. Write the Scariest Opening Line"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500 transition"
        />
      </div>

      {/* ── Description field (optional) ─────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)} // update description field
          rows={3}
          placeholder="Explain the challenge to participants..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500 transition resize-none"
        />
      </div>

      {/* ── Prompt field ─────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Writing Prompt <span className="text-red-400">*</span>
        </label>
        <textarea
          value={form.prompt}
          onChange={e => set('prompt', e.target.value)} // update prompt field
          rows={3}
          placeholder="The specific prompt participants must write to..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-red-500 transition resize-none"
        />
      </div>

      {/* ── Start and End Date fields (side by side) ─────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Start Date <span className="text-red-400">*</span>
          </label>
          {/* datetime-local input — renders a native date+time picker */}
          <input
            type="datetime-local"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)} // update startDate
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            End Date <span className="text-red-400">*</span>
          </label>
          <input
            type="datetime-local"
            value={form.endDate}
            onChange={e => set('endDate', e.target.value)} // update endDate
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition"
          />
        </div>
      </div>

      {/* ── Active toggle switch ─────────────────────────────────────────── */}
      {/* A custom CSS toggle pill instead of a checkbox — matches the site design system */}
      <label className="flex items-center gap-3 cursor-pointer">
        {/* The pill track — red when active, gray when inactive */}
        <div
          onClick={() => set('active', !form.active)} // flip the boolean on click
          className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? 'bg-red-600' : 'bg-gray-700'}`}
        >
          {/* The sliding white dot — translates to the right when active */}
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        {/* Label text next to the toggle */}
        <span className="text-sm text-gray-300">Active (visible to users)</span>
      </label>

      {/* ── Submit and Cancel buttons ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        {/* Submit button — shows "Creating…" and is disabled while saving */}
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
        >
          {saving ? 'Creating…' : 'Create Challenge'}
        </button>

        {/* Cancel button — navigates back without submitting */}
        <button
          type="button"
          onClick={() => router.push('/admin/challenges')} // go back to the admin challenges list
          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
