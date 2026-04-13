'use client';
// ============================================================
// FILE: ContactForm.tsx
// PURPOSE: The public contact form on the /contact page.
//          Collects name, email, subject (dropdown), and message,
//          then POSTs to /api/contact. After a successful send the
//          form is replaced by a thank-you screen with an option to
//          send another message.
//
// KEY CONCEPT — status state machine:
//   Instead of separate isLoading/isSuccess/isError booleans, a single
//   `status` string acts as a state machine with four values:
//     'idle'    → form is ready to fill in
//     'sending' → POST is in-flight (submit button shows "Sending…")
//     'sent'    → success (the whole form is replaced by a thank-you screen)
//     'error'   → something went wrong (error message shows above the button)
//   This pattern is cleaner than juggling multiple booleans.
//
// KEY CONCEPT — handleChange with computed key:
//   All four inputs share a single onChange handler. It uses the input's
//   `name` attribute as a dynamic object key to update only the changed
//   field: setForm({ ...form, [e.target.name]: e.target.value }).
//   This avoids writing four separate handlers.
//
// HOW TO REUSE IN ANOTHER PROJECT:
//   - Update the fetch URL (/api/contact) to your own API route.
//   - Change the subject <option> list to match your categories.
//   - The status state machine pattern works for any multi-step async form.
// ============================================================
import { useState } from 'react';

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-10 gap-4">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Message sent!</h2>
        <p className="text-gray-400 text-sm max-w-xs">
          Thanks for reaching out. We will get back to you within 24–48 hours.
        </p>
        <button
          onClick={() => { setStatus('idle'); setForm({ name: '', email: '', subject: '', message: '' }); }}
          className="mt-2 text-sm text-red-400 hover:text-red-300 transition"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-lg font-semibold text-white mb-1">Send us a message</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Your Name</label>
          <input
            name="name" type="text" placeholder="John Doe"
            value={form.name} onChange={handleChange} required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Email Address</label>
          <input
            name="email" type="email" placeholder="you@example.com"
            value={form.email} onChange={handleChange} required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Subject</label>
        <select
          name="subject" value={form.subject} onChange={handleChange} required
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
        >
          <option value="" disabled>Select a subject…</option>
          <option value="General Question">General Question</option>
          <option value="Report a User">Report a User</option>
          <option value="Report Content">Report Content</option>
          <option value="Account Issue">Account Issue</option>
          <option value="Bug Report">Bug Report</option>
          <option value="Partnership / Collab">Partnership / Collab</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Message</label>
        <textarea
          name="message" placeholder="Tell us what's on your mind…"
          value={form.message} onChange={handleChange} required rows={6}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition resize-none"
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-lg">
          Something went wrong. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition text-sm"
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}
