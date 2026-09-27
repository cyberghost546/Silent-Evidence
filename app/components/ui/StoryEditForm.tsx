'use client';
// app/components/ui/StoryEditForm.tsx
//
// WHY 'use client'?
//   Manages a large controlled form with autosave, image upload, AI suggestions,
//   and the RichEditor — all requiring browser-side hooks and event handlers.
//
// PURPOSE:
//   The full story editor shown on /story/[slug]/edit. Handles:
//     • Title, content (via RichEditor), excerpt, cover image, category, status
//     • Content warnings (preset chips + custom input) serialised as JSON
//     • Content rating (ALL / TEEN / MATURE)
//     • Scheduled publish date (datetime-local input)
//     • Video URL attachment
//
// AUTOSAVE:
//   `doAutosave` debounces field changes with a 2-second timer. It reads from
//   `latestFields` ref (not React state) to always capture the current values
//   without needing the effect to re-register on every keystroke. PATCH
//   /api/stories/[id] is called silently in the background; the "Saved" badge
//   confirms success.
//
// RICH EDITOR (dynamic import):
//   `RichEditor` is loaded with `dynamic(..., { ssr: false })` because it uses
//   browser APIs (contentEditable, execCommand) that don't exist on the server.
//   This avoids a hydration mismatch without needing a Suspense boundary.
//
// WARNINGS:
//   Stored in the DB as a JSON-encoded string array. On mount, we parse the
//   stored string back to string[]. On save, we JSON.stringify it back. Preset
//   chips toggle on/off; the custom input appends arbitrary strings.

import { useState, useRef, useCallback, useEffect } from 'react';
import { Circle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false });

// Predefined content warning chips the author can toggle on/off
const PRESET_WARNINGS = [
  'Violence',
  'Gore',
  'Death',
  'Sexual Content',
  'Child Endangerment',
  'Animal Cruelty',
  'Self-harm',
  'Suicide',
  'Abuse',
  'Torture',
  'Phobias',
];

type Story = {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  videoUrl: string | null;
  status: string;
  categoryId: number;
  scheduledAt: string | null; // ISO string from the server, null if not scheduled
  warnings: string | null; // JSON-encoded string[] stored in DB
  contentRating: string | null; // 'ALL' | 'TEEN' | 'MATURE'
};

type Category = { id: number; name: string };

export default function StoryEditForm({
  story,
  categories,
}: {
  story: Story;
  categories: Category[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(story.title);
  const [content, setContent] = useState(story.content);
  const [wordCount, setWordCount] = useState(0);
  const [excerpt, setExcerpt] = useState(story.excerpt ?? '');
  const [coverImage, setCoverImage] = useState(story.coverImage ?? '');
  const [videoUrl, setVideoUrl] = useState(story.videoUrl ?? '');
  const [categoryId, setCategoryId] = useState(story.categoryId);
  const [status, setStatus] = useState(story.status);
  // scheduledAt stored as a datetime-local string ("YYYY-MM-DDTHH:MM") for the input element
  const [scheduledAt, setScheduledAt] = useState(
    story.scheduledAt ? story.scheduledAt.slice(0, 16) : ''
  );
  // Content rating — who can read this story
  const [contentRating, setContentRating] = useState<'ALL' | 'TEEN' | 'MATURE'>(
    (story.contentRating as 'ALL' | 'TEEN' | 'MATURE') ?? 'ALL'
  );
  // warnings: array of selected warning strings; persisted to DB as JSON
  const [warnings, setWarnings] = useState<string[]>(() => {
    try {
      return story.warnings ? JSON.parse(story.warnings) : [];
    } catch {
      return [];
    }
  });
  // Input for adding a custom warning not in the presets
  const [customWarning, setCustomWarning] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploadingImg, setUploadingImg] = useState(false);
  const [imgError, setImgError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFields = useRef({ title, content, excerpt, coverImage, categoryId, status });

  const doAutosave = useCallback(async () => {
    const f = latestFields.current;
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: f.title,
          content: f.content,
          excerpt: f.excerpt,
          coverImage: f.coverImage,
          categoryId: f.categoryId,
        }),
      });
      setSaveStatus(res.ok ? 'saved' : 'idle');
    } catch {
      setSaveStatus('idle');
    }
  }, [story.id]);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(doAutosave, 3000);
  }, [doAutosave]);

  const update = <K extends keyof typeof latestFields.current>(
    key: K,
    val: (typeof latestFields.current)[K],
    setter: (v: typeof val) => void
  ) => {
    setter(val);
    latestFields.current = { ...latestFields.current, [key]: val };
    scheduleAutosave();
  };

  // ── Co-author state ──────────────────────────────────────────────────────────
  type Collaborator = {
    id: number;
    accepted: boolean | null;
    user: { id: number; username: string; profile: { avatar: string | null } | null };
  };
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);

  // Fetch existing collaborators once on mount
  useEffect(() => {
    fetch(`/api/collaborators?storyId=${story.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCollabs(data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id]);

  // Invite a new co-author by username
  const sendInvite = async () => {
    if (!inviteInput.trim()) return;
    setInviting(true);
    setInviteError('');
    const res = await fetch('/api/collaborators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId: story.id, inviteeUsername: inviteInput.trim() }),
    });
    const data = await res.json();
    setInviting(false);
    if (!res.ok) {
      setInviteError(data.error ?? 'Invite failed.');
      return;
    }
    setCollabs((prev) => [...prev, data]); // Add the new collaborator to the list
    setInviteInput('');
  };

  // Upload a cover image file and set the returned URL as the cover image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError('');
    setUploadingImg(true);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/stories/cover', { method: 'POST', body: form });
    const data = await res.json();
    setUploadingImg(false);
    if (!res.ok) {
      setImgError(data.error ?? 'Upload failed.');
      return;
    }
    update('coverImage', data.url, setCoverImage);
  };

  const handleContentChange = (html: string, wc: number) => {
    setWordCount(wc);
    update('content', html, setContent);
  };

  const save = async () => {
    setLoading(true);
    setError('');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    const res = await fetch(`/api/stories/${story.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        excerpt,
        coverImage,
        videoUrl: videoUrl || null,
        categoryId,
        status,
        scheduledAt: scheduledAt || null,
        warnings: JSON.stringify(warnings),
        contentRating,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Save failed.');
      return;
    }
    // Published stories navigate to the live page; everything else (draft, scheduled, archived) goes to my-stories
    router.push(status === 'PUBLISHED' ? `/story/${data.slug}` : '/my-stories');
  };

  const getAiSuggestion = async () => {
    if (!content.trim() || aiLoading) return;
    setAiLoading(true);
    setAiSuggestion('');
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      });
      const data = await res.json();
      setAiSuggestion(data.suggestion ?? 'No suggestion generated.');
    } catch {
      setAiSuggestion('Could not reach the AI. Try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const deleteStory = async () => {
    setLoading(true);
    const res = await fetch(`/api/stories/${story.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/my-stories');
    else {
      setLoading(false);
      setError('Delete failed.');
    }
  };

  const inputCls =
    'w-full bg-gray-800 border border-gray-700 focus:border-red-600 focus:outline-none rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 transition';

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => update('title', e.target.value, setTitle)}
          className={inputCls}
          maxLength={200}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Category
        </label>
        <select
          value={categoryId}
          onChange={(e) => update('categoryId', Number(e.target.value), setCategoryId)}
          className={inputCls}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Excerpt
        </label>
        <textarea
          value={excerpt}
          onChange={(e) => update('excerpt', e.target.value, setExcerpt)}
          className={`${inputCls} resize-none`}
          rows={2}
          maxLength={500}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Cover Image
        </label>

        {/* Preview current cover image */}
        {coverImage && (
          <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-700 mb-3">
            <Image
              src={coverImage}
              alt="Cover preview"
              fill
              sizes="100vw"
              className="object-cover"
            />
            {/* Remove image button */}
            <button
              type="button"
              onClick={() => update('coverImage', '', setCoverImage)}
              className="absolute top-2 right-2 px-2 py-1 text-xs bg-black/70 hover:bg-red-600 text-white rounded-lg transition"
            >
              Remove
            </button>
          </div>
        )}

        {/* Upload a new image */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImg}
          className="px-4 py-2.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 border border-gray-600 text-white rounded-xl transition w-full"
        >
          {uploadingImg ? 'Uploading…' : coverImage ? 'Replace image' : 'Upload image'}
        </button>
        {imgError && <p className="text-xs text-red-400 mt-1">{imgError}</p>}

        {/* Or paste a URL manually */}
        <p className="text-xs text-gray-500 mt-2 mb-1">Or paste an image URL:</p>
        <input
          value={coverImage}
          onChange={(e) => update('coverImage', e.target.value, setCoverImage)}
          className={inputCls}
          type="url"
          placeholder="https://..."
        />
      </div>

      {/* Video URL */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Video URL{' '}
          <span className="text-gray-600 font-normal normal-case">
            (optional — YouTube or .mp4)
          </span>
        </label>
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className={inputCls}
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <p className="text-xs text-gray-600 mt-1">
          Readers will see this video embedded on the story page.
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
            Content
          </label>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">{wordCount} words</span>
            {saveStatus === 'saving' && <span className="text-gray-500">Saving…</span>}
            {saveStatus === 'saved' && <span className="text-green-500">✓ Autosaved</span>}
          </div>
        </div>
        <RichEditor value={content} onChange={handleContentChange} />

        {/* AI writing suggestion — asks Claude what could happen next */}
        <div className="mt-3">
          <button
            type="button"
            onClick={getAiSuggestion}
            disabled={aiLoading || !content.trim()}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-900/40 border border-purple-700/50 text-purple-300 hover:bg-purple-900/70 hover:border-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{aiLoading ? '✦' : '✦'}</span>
            {aiLoading ? 'Thinking…' : 'What happens next?'}
          </button>
          {aiSuggestion && (
            <div className="mt-3 p-4 bg-purple-950/30 border border-purple-800/40 rounded-xl">
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-widest mb-2">
                AI Suggestion
              </p>
              <p className="text-sm text-gray-300 leading-relaxed italic">{aiSuggestion}</p>
              <button
                type="button"
                onClick={() => setAiSuggestion('')}
                className="mt-2 text-xs text-gray-600 hover:text-gray-400 transition"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            latestFields.current.status = e.target.value;
          }}
          className={inputCls}
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Scheduled date picker — only shown when status is SCHEDULED */}
      {status === 'SCHEDULED' && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
            Publish Date & Time
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-gray-500 mt-1">
            The story will appear as scheduled. You will need to manually publish it after this
            time, or set up a cron job.
          </p>
        </div>
      )}

      {/* ── Content Rating ──────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Content Rating{' '}
          <span className="text-gray-600 font-normal normal-case">(who can read this?)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'ALL', tone: 'text-blue-400', label: 'All Ages', desc: 'Safe for everyone' },
              {
                value: 'TEEN',
                tone: 'text-yellow-400',
                label: '13+ Teen',
                desc: 'Mild action / violence',
              },
              {
                value: 'MATURE',
                tone: 'text-red-400',
                label: '18+ Mature',
                desc: 'Explicit / extreme',
              },
            ] as const
          ).map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setContentRating(r.value)}
              className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition ${
                contentRating === r.value
                  ? 'border-red-500 bg-red-600/10 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Circle className={`w-3.5 h-3.5 mb-1 ${r.tone}`} strokeWidth={3} aria-hidden="true" />
              <span className="font-semibold">{r.label}</span>
              <span className="text-gray-500 mt-0.5 leading-tight">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Warnings ────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Content Warnings <span className="text-gray-600 font-normal normal-case">(optional)</span>
        </label>

        {/* Preset chips — toggle on/off by clicking */}
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_WARNINGS.map((w) => {
            const active = warnings.includes(w);
            return (
              <button
                key={w}
                type="button"
                onClick={() =>
                  setWarnings((prev) => (active ? prev.filter((x) => x !== w) : [...prev, w]))
                }
                className={`text-xs px-3 py-1.5 rounded-full border transition font-medium ${
                  active
                    ? 'bg-red-600/20 border-red-500/60 text-red-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-red-500/40 hover:text-red-300'
                }`}
              >
                {active ? '✕ ' : '+ '}
                {w}
              </button>
            );
          })}
        </div>

        {/* Custom warning input */}
        <div className="flex gap-2">
          <input
            value={customWarning}
            onChange={(e) => setCustomWarning(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const trimmed = customWarning.trim();
                if (trimmed && !warnings.includes(trimmed)) {
                  setWarnings((prev) => [...prev, trimmed]);
                }
                setCustomWarning('');
              }
            }}
            placeholder="Add custom warning…"
            className={`${inputCls} flex-1`}
            maxLength={60}
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = customWarning.trim();
              if (trimmed && !warnings.includes(trimmed)) {
                setWarnings((prev) => [...prev, trimmed]);
              }
              setCustomWarning('');
            }}
            disabled={!customWarning.trim()}
            className="px-4 py-2.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 border border-gray-600 text-white rounded-xl transition"
          >
            Add
          </button>
        </div>

        {/* Active custom warnings (not in presets) shown as removable chips */}
        {warnings.filter((w) => !PRESET_WARNINGS.includes(w)).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {warnings
              .filter((w) => !PRESET_WARNINGS.includes(w))
              .map((w) => (
                <span
                  key={w}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-red-600/20 border border-red-500/60 text-red-400"
                >
                  {w}
                  <button
                    type="button"
                    onClick={() => setWarnings((prev) => prev.filter((x) => x !== w))}
                    className="ml-0.5 text-red-400 hover:text-red-200 leading-none"
                  >
                    ✕
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Co-author invitations section */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Co-Authors
        </label>

        {/* List current collaborators with their status */}
        {collabs.length > 0 && (
          <div className="space-y-2 mb-3">
            {collabs.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
              >
                <span className="text-white font-medium flex-1">{c.user.username}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    c.accepted === true
                      ? 'text-green-400 border-green-500/40 bg-green-500/10'
                      : c.accepted === false
                        ? 'text-gray-500 border-gray-700 bg-gray-800'
                        : 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10'
                  }`}
                >
                  {c.accepted === true ? 'Accepted' : c.accepted === false ? 'Declined' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Invite input */}
        <div className="flex gap-2">
          <input
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                sendInvite();
              }
            }}
            placeholder="Invite by username…"
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={sendInvite}
            disabled={inviting || !inviteInput.trim()}
            className="px-4 py-2.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 border border-gray-600 text-white rounded-xl transition"
          >
            {inviting ? '…' : 'Invite'}
          </button>
        </div>
        {inviteError && <p className="text-xs text-red-400 mt-1">{inviteError}</p>}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setDelConfirm(true)}
          className="px-4 py-2.5 text-sm text-red-400 border border-red-600/30 hover:bg-red-600/10 rounded-xl transition"
        >
          Delete story
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-300 hover:text-white rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={loading}
            className="px-6 py-2.5 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Delete this story?</h3>
            <p className="text-sm text-gray-400 mb-6">
              This action cannot be undone. All comments and likes will also be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDelConfirm(false)}
                className="flex-1 px-4 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-300 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteStory}
                disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition"
              >
                {loading ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
