'use client';
// app/admin/email-templates/page.tsx
// Live editor for the site's transactional email HTML templates.
// Templates are stored in the SiteSetting table under email_* keys.

import { useEffect, useState } from 'react';

const TEMPLATES = [
  { key: 'email_welcome',       label: 'Welcome Email',          desc: 'Sent when a new user registers' },
  { key: 'email_newsletter',    label: 'Weekly Newsletter',       desc: 'Sent every week to subscribers' },
  { key: 'email_digest',        label: 'Comment Digest',          desc: 'Sent periodically with recent comments' },
  { key: 'email_follow_notify', label: 'New Story (Follow alert)', desc: 'Sent to followers when an author publishes' },
];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [activeKey, setActiveKey] = useState(TEMPLATES[0].key);
  const [draft, setDraft]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved,  setSaved]        = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch('/api/admin/email-templates')
      .then(r => r.json())
      .then(d => { setTemplates(d.templates ?? {}); setDraft(d.templates?.[activeKey] ?? ''); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchTemplate = (key: string) => {
    setTemplates(prev => ({ ...prev, [activeKey]: draft }));
    setActiveKey(key);
    setDraft(templates[key] ?? '');
  };

  const save = async () => {
    setSaving(true);
    await fetch('/api/admin/email-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: activeKey, value: draft }),
    });
    setTemplates(prev => ({ ...prev, [activeKey]: draft }));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const active = TEMPLATES.find(t => t.key === activeKey)!;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Email Templates</h1>
      <p className="text-gray-500 text-sm mb-6">Edit the HTML sent in transactional emails. Use <code className="text-red-400 bg-gray-800 px-1 rounded">{'{{PLACEHOLDER}}'}</code> variables shown in each template.</p>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Template selector */}
        <div className="space-y-2">
          {TEMPLATES.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTemplate(t.key)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                activeKey === t.key
                  ? 'bg-red-600/10 border-red-600/40 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              <p className="text-sm font-semibold">{t.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{active.label}</p>
              <p className="text-xs text-gray-500">{active.desc}</p>
            </div>
            <div className="flex items-center gap-3">
              {saved  && <span className="text-xs text-green-400">✓ Saved</span>}
              {saving && <span className="text-xs text-gray-500 animate-pulse">Saving…</span>}
              <button type="button" onClick={save} disabled={saving || loading} className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition disabled:opacity-50">
                Save Template
              </button>
            </div>
          </div>

          {loading ? (
            <div className="h-96 bg-gray-900 border border-gray-700 rounded-2xl animate-pulse" />
          ) : (
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={22}
              spellCheck={false}
              className="w-full bg-gray-900 border border-gray-700 rounded-2xl p-4 text-sm text-gray-200 font-mono focus:outline-none focus:border-red-600/50 resize-y"
            />
          )}

          {/* Preview */}
          {!loading && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Preview</p>
              <div
                className="border border-gray-700 rounded-2xl overflow-hidden bg-white"
                dangerouslySetInnerHTML={{ __html: draft }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
