'use client';
// app/components/ui/StoryForm.tsx
// The full story creation form used on the /write page.
// Handles title, category, excerpt, cover image, mood, language, content (via RichEditor),
// autosave to localStorage every 30 seconds, AI writing assistant, template picker,
// and final POST to /api/stories to publish or save as draft.
// Props: categories — list of {id, name} fetched server-side; initialExcerpt — pre-filled excerpt.
import { useState, useRef, useCallback, useEffect, ChangeEvent } from 'react';
import { Circle, Lock } from 'lucide-react';
import { MOOD_OPTIONS } from '@/lib/moods';
import { useRouter } from 'next/navigation';
import { LANGUAGES } from '@/lib/languages';
import dynamic from 'next/dynamic';
import StoryTemplatePicker from './StoryTemplatePicker';
import { getCsrfToken } from '@/lib/getCsrfToken';

const RichEditor = dynamic(() => import('./RichEditor'), { ssr: false });
const AIWritingAssistant = dynamic(() => import('./AIWritingAssistant'), { ssr: false });

type Category = { id: number; name: string };

export default function StoryForm({
  categories,
  initialExcerpt = '',
  // Author Pro unlocks monetisation and rich-media fields. This only controls
  // what the form shows — the API rejects these fields for non-subscribers
  // regardless of what the browser submits.
  isAuthorPro = false,
}: {
  categories: Category[];
  initialExcerpt?: string;
  isAuthorPro?: boolean;
}) {
  const router = useRouter();

  const [title, setTitle]           = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [excerpt, setExcerpt]       = useState(initialExcerpt);
  const [content, setContent]       = useState('');
  const [wordCount, setWordCount]   = useState(0);
  const [coverImage, setCoverImage] = useState('');
  const [videoUrl, setVideoUrl]     = useState('');
  const [status, setStatus]         = useState<'DRAFT' | 'PUBLISHED' | 'SCHEDULED'>('DRAFT');
  const [language, setLanguage]     = useState('en');
  const [mood, setMood]             = useState('');
  const [contentRating, setContentRating] = useState<'ALL' | 'TEEN' | 'MATURE'>('ALL');
  const [warnings, setWarnings]     = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [seriesId, setSeriesId]     = useState('');
  const [seriesOrder, setSeriesOrder] = useState('');
  const [userSeries, setUserSeries] = useState<{id:number;name:string}[]>([]);
  const [seriesLoaded, setSeriesLoaded] = useState(false);
  const [isPremiumOnly, setIsPremiumOnly]       = useState(false);
  const [earlyAccessUntil, setEarlyAccessUntil] = useState('');
  const [audioUrl, setAudioUrl]                 = useState('');
  // Price as the author types it, in DOLLARS. Converted to integer cents on
  // submit — Story.price is cents, and sending dollars would undercharge by 100x.
  const [priceDollars, setPriceDollars]         = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude]     = useState('');
  const [longitude, setLongitude]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  // Cover image — tab: 'url' or 'upload'
  const [coverTab, setCoverTab]         = useState<'url' | 'upload'>('url');
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState('');
  const coverFileRef                    = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  // Template picker visibility
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Banner shown when a localStorage draft is restored
  const [draftRestored, setDraftRestored] = useState(false);

  // Autosave refs — persisted across renders without triggering re-render
  const autosaveId    = useRef<number | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestTitle   = useRef(title);
  const latestContent = useRef(content);
  const latestCatId   = useRef(categoryId);

  // localStorage key for draft backup
  const LS_KEY = 'se_draft_backup';

  // On mount: restore any unsaved draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { title: t, content: c, categoryId: cid } = JSON.parse(saved);
        if (t) { setTitle(t); latestTitle.current = t; }
        if (c) { setContent(c); latestContent.current = c; }
        if (cid) { setCategoryId(cid); latestCatId.current = cid; }
        setDraftRestored(true);
      }
    } catch { /* corrupt data — ignore */ }

    // Save to localStorage every 30 seconds as a crash-recovery backup
    localSaveTimer.current = setInterval(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          title: latestTitle.current,
          content: latestContent.current,
          categoryId: latestCatId.current,
        }));
      } catch { /* storage quota — ignore */ }
    }, 30_000);

    return () => {
      if (localSaveTimer.current) clearInterval(localSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doAutosave = useCallback(async (t: string, c: string, cid: string) => {
    // Strip HTML tags to check if content is actually empty
    const textOnly = c.replace(/<[^>]*>/g, '').trim();
    if (!t.trim() || !textOnly || !cid) return;

    setSaveStatus('saving');
    try {
      if (autosaveId.current === null) {
        const res = await fetch('/api/stories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t, categoryId: Number(cid), content: c, excerpt: '', status: 'DRAFT', language: 'en' }),
        });
        if (res.ok) {
          const data = await res.json();
          autosaveId.current = data.id;
          setSaveStatus('saved');
        } else {
          setSaveStatus('idle');
        }
      } else {
        const res = await fetch(`/api/stories/${autosaveId.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t, content: c }),
        });
        setSaveStatus(res.ok ? 'saved' : 'idle');
      }
    } catch {
      setSaveStatus('idle');
    }
  }, []);

  const scheduleAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      doAutosave(latestTitle.current, latestContent.current, latestCatId.current);
    }, 3000);
  }, [doAutosave]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    latestTitle.current = val;
    scheduleAutosave();
  };

  const handleCategoryChange = (val: string) => {
    setCategoryId(val);
    latestCatId.current = val;
    scheduleAutosave();
  };

  const handleContentChange = (html: string, wc: number) => {
    setContent(html);
    setWordCount(wc);
    latestContent.current = html;
    scheduleAutosave();
  };

  const handleCoverUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json();
      setUploadError(data.error ?? 'Upload failed');
      return;
    }
    const { url } = await res.json();
    setCoverImage(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    // Clear the localStorage backup now that the user is submitting intentionally
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }

    // Dollars → integer cents. Math.round avoids float drift turning "4.99"
    // into 498.99999… and then 498 once truncated. Empty/0/invalid means free,
    // sent as null so the API stores no price rather than a price of zero.
    const parsedPrice = Math.round(parseFloat(priceDollars) * 100);
    const priceCents =
      Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;

    if (autosaveId.current !== null) {
      // Patch the existing autosaved draft with final values
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/stories/${autosaveId.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ title, content, excerpt, coverImage: coverImage || null, categoryId: Number(categoryId), status, language }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
      router.push(status === 'PUBLISHED' ? `/story/${data.slug}` : '/my-stories');
    } else {
      const csrfToken = await getCsrfToken();
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ title, categoryId: Number(categoryId), excerpt, content, coverImage: coverImage || null, videoUrl: videoUrl || null, audioUrl: audioUrl || null, status, language, mood: mood || null, contentRating, warnings: warnings.length ? JSON.stringify(warnings) : null, scheduledAt: scheduledAt || null, seriesId: seriesId ? Number(seriesId) : null, seriesOrder: seriesOrder ? Number(seriesOrder) : null, locationName: locationName || null, latitude: latitude ? Number(latitude) : null, longitude: longitude ? Number(longitude) : null, isPremiumOnly, earlyAccessUntil: earlyAccessUntil || null, price: priceCents }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
      router.push(status === 'PUBLISHED' ? `/story/${data.slug}` : '/my-stories');
    }
  };

  return (
    // suppressHydrationWarning prevents React hydration errors caused by browser extensions
    // like Dashlane/LastPass that inject extra attributes (data-dashlane-rid etc.) into inputs
    <>
    {/* Template picker modal — shown when user clicks "Use a Template" */}
    {showTemplatePicker && (
      <StoryTemplatePicker
        onSelect={template => {
          // Pre-fill the form with the selected template's content and mood
          setContent(template.content);
          setMood(template.mood);
          latestContent.current = template.content;
          setShowTemplatePicker(false);
        }}
        onClose={() => setShowTemplatePicker(false)}
      />
    )}
    <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>

      {/* Template picker trigger — shown only when the form is empty */}
      {!content && (
        <div className="flex items-center justify-between border border-dashed border-gray-700 rounded-xl px-4 py-3">
          <p className="text-sm text-gray-500">Need inspiration? Start with a template.</p>
          <button
            type="button"
            onClick={() => setShowTemplatePicker(true)}
            className="text-sm text-red-400 hover:text-red-300 font-medium transition flex-shrink-0 ml-4"
          >
            Use a Template →
          </button>
        </div>
      )}

      {/* Draft restored banner — shown when localStorage had unsaved content */}
      {draftRestored && (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm px-4 py-2.5 rounded-lg">
          <span>Draft restored from your last session.</span>
          <button
            type="button"
            onClick={() => {
              // Discard the restored draft and reset the form
              try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
              setTitle(''); setContent(''); setCategoryId('');
              latestTitle.current = ''; latestContent.current = ''; latestCatId.current = '';
              setDraftRestored(false);
            }}
            className="text-xs underline hover:text-amber-200 ml-4"
          >
            Discard
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Give your story a chilling title..."
          required
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
          suppressHydrationWarning
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          required
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition appearance-none"
        >
          <option value="" disabled>Select a category...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Story Language <span className="text-gray-500 font-normal">(what language is your story written in?)</span>
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition appearance-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.flag} {l.label} — {l.nativeLabel}</option>
          ))}
        </select>
      </div>

      {/* Cover image */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Cover Image <span className="text-gray-500 font-normal">(optional)</span>
        </label>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1 mb-3 w-fit">
          {(['upload', 'url'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => { setCoverTab(tab); setUploadError(''); }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                coverTab === tab ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'upload' ? 'Upload from device' : 'Paste URL'}
            </button>
          ))}
        </div>

        {coverTab === 'upload' ? (
          <div
            onClick={() => coverFileRef.current?.click()}
            className="relative flex flex-col items-center justify-center gap-2 w-full h-36 border-2 border-dashed border-gray-700 hover:border-red-600/60 rounded-lg cursor-pointer transition group bg-gray-900"
          >
            <input
              ref={coverFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleCoverUpload}
            />
            {uploading ? (
              <p className="text-sm text-gray-400 animate-pulse">Uploading…</p>
            ) : (
              <>
                <p className="text-sm text-gray-400 group-hover:text-white transition">
                  Click to choose an image
                </p>
                <p className="text-xs text-gray-600">JPEG, PNG, WebP or GIF · max 5 MB</p>
              </>
            )}
            {uploadError && (
              <p className="absolute bottom-2 text-xs text-red-400">{uploadError}</p>
            )}
          </div>
        ) : (
          <input
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
          />
        )}

        {/* Preview — shown regardless of which tab set the URL */}
        {coverImage && (
          <div className="relative mt-3">
            <img
              src={coverImage}
              alt="Cover preview"
              className="w-full h-48 object-cover rounded-lg border border-gray-700"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <button
              type="button"
              onClick={() => { setCoverImage(''); if (coverFileRef.current) coverFileRef.current.value = ''; }}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-1 rounded-md transition"
            >
              ✕ Remove
            </button>
          </div>
        )}
      </div>

      {/* Video URL */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Video URL <span className="text-gray-500 font-normal">(optional — YouTube link or direct .mp4)</span>
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
        />
        <p className="text-xs text-gray-600 mt-1">Paste a YouTube link and readers will see the video embedded on your story page.</p>
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Short Description <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="A one or two sentence teaser shown on story cards..."
          rows={2}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition resize-none"
        />
      </div>

      {/* Content — rich editor */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-300">
            Your Story <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500">{wordCount} words</span>
            {saveStatus === 'saving' && <span className="text-gray-500">Saving…</span>}
            {saveStatus === 'saved'  && <span className="text-green-500">✓ Draft saved</span>}
          </div>
        </div>
        <RichEditor
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing your story here…"
        />
        <AIWritingAssistant
          title={title}
          content={content}
          onInsert={(text) => setContent(prev => prev + text)}
        />
      </div>

      {/* Series */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Story Series <span className="text-gray-500 font-normal">(optional)</span></label>
        <div className="flex gap-2">
          <select value={seriesId} onFocus={() => { if (!seriesLoaded) { fetch('/api/series').then(r=>r.json()).then(d=>{ setUserSeries(d); setSeriesLoaded(true); }); }}}
            onChange={e => setSeriesId(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition appearance-none">
            <option value="">— Not part of a series —</option>
            {userSeries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {seriesId && (
            <input type="number" min={1} value={seriesOrder} onChange={e => setSeriesOrder(e.target.value)}
              placeholder="Part #" suppressHydrationWarning
              className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition" />
          )}
        </div>
        <p className="text-xs text-gray-600 mt-1">Don't see your series? <a href="/series/new" className="text-red-400 hover:text-red-300 transition">Create one first →</a></p>
      </div>

      {/* Location (for Horror Map) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
 Location <span className="text-gray-500 font-normal">(optional — pins story on the Horror Map)</span>
        </label>
        <input value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="e.g. Amityville, New York"
          suppressHydrationWarning
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition mb-2" />
        <div className="flex gap-2">
          <input type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Latitude (e.g. 40.7128)"
            suppressHydrationWarning
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition" />
          <input type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Longitude (e.g. -74.0060)"
            suppressHydrationWarning
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition" />
        </div>
        <p className="text-xs text-gray-600 mt-1">Find coordinates at <span className="text-gray-400">latlong.net</span></p>
      </div>

      {/* Mood */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Story Mood <span className="text-gray-500 font-normal">(optional)</span></label>
        <select value={mood} onChange={e => setMood(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition appearance-none">
          {/* Options come from lib/moods.ts. They were hard-coded, and still
              offered the old generic vocabulary — so picking "Mysterious" or
              "Comedic" sent the API a value the Mood enum had no room for. */}
          <option value="">— No mood selected —</option>
          {MOOD_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Content Rating — controls who can read this story */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Content Rating <span className="text-gray-500 font-normal">(who can read this?)</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'ALL',    tone: 'text-blue-400',   label: 'All Ages',    desc: 'Safe for everyone' },
            { value: 'TEEN',   tone: 'text-yellow-400', label: '13+ Teen',    desc: 'Mild action / violence' },
            { value: 'MATURE', tone: 'text-red-400',    label: '18+ Mature',  desc: 'Explicit / extreme content' },
          ] as const).map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => setContentRating(r.value)}
              className={`flex flex-col items-center text-center p-3 rounded-xl border text-xs transition ${
                contentRating === r.value
                  ? 'border-green-500 bg-green-600/10 text-white'
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

      {/* Content Warnings */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Content Warnings <span className="text-gray-500 font-normal">(select all that apply)</span></label>
        <div className="flex flex-wrap gap-2">
          {['Violence','Dark Themes','Mature Language','Spoilers','Character Death','Emotional','Psychological Drama','Plot Twists'].map(w => (
            <button key={w} type="button"
              onClick={() => setWarnings(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w])}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition ${warnings.includes(w) ? 'bg-green-600/20 border-green-500/50 text-green-300' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Scheduled Publishing */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Schedule Publishing <span className="text-gray-500 font-normal">(optional — leave blank to publish now)</span>
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={e => {
            const val = e.target.value;
            setScheduledAt(val);
            // Auto-select SCHEDULED status when a date is picked; revert to DRAFT when cleared
            setStatus(val ? 'SCHEDULED' : 'DRAFT');
          }}
          min={new Date().toISOString().slice(0, 16)}
          suppressHydrationWarning
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
        />
        {scheduledAt && (
          <p className="text-xs text-amber-400/80 mt-1.5">
 Will auto-publish on {new Date(scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* ── Author Pro upsell ──────────────────────────────────────────────
          Shown in place of the gated fields. Free authors see what the plan
          unlocks rather than the tools simply being absent — an explained lock
          converts, a missing section just confuses. */}
      {!isAuthorPro && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex items-start gap-3">
          <span className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Lock className="w-4 h-4 text-amber-400" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Selling, early access & rich media</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Charge for this story, publish it members-only, set an early-access
              window, or attach audio narration — all part of Author Pro.
            </p>
          </div>
          <a
            href="/author-pro"
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition"
          >
            Upgrade
          </a>
        </div>
      )}

      {/* Audio narration URL — Author Pro only */}
      {isAuthorPro && (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
 Audio Narration URL <span className="text-gray-500 font-normal">(optional — MP3 link for premium listeners)</span>
        </label>
        <input
          type="url"
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          placeholder="https://example.com/narration.mp3"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 transition"
        />
        <p className="text-xs text-gray-600 mt-1">Only premium members will be able to play this audio.</p>
      </div>
      )}

      {/* Premium options — Author Pro only */}
      {isAuthorPro && (
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest text-yellow-500/70">Premium Options</p>

        {/* Price — readers must buy the story before they can read it */}
        <div>
          <label htmlFor="storyPrice" className="block text-sm font-medium text-gray-300 mb-1">
            Price <span className="text-gray-500 font-normal">(optional — leave blank to publish free)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">$</span>
            <input
              id="storyPrice"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              placeholder="0.00"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-7 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Readers pay once for permanent access. Premium members and anyone who
            already bought it are unaffected.
          </p>
        </div>

        {/* Members-only toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-300">Members-Only Story</p>
            <p className="text-xs text-gray-500 mt-0.5">Only premium subscribers can read this story. It will never be made free.</p>
          </div>
          <button
            type="button"
            aria-label={isPremiumOnly ? 'Disable members-only' : 'Enable members-only'}
            onClick={() => setIsPremiumOnly(v => !v)}
            className={`shrink-0 w-11 h-6 rounded-full border transition relative ${isPremiumOnly ? 'bg-yellow-500 border-yellow-400' : 'bg-gray-800 border-gray-700'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isPremiumOnly ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Early access window */}
        <div>
          <label htmlFor="earlyAccessUntil" className="block text-sm font-medium text-gray-300 mb-1">
 Early Access Until <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <input
            id="earlyAccessUntil"
            type="datetime-local"
            value={earlyAccessUntil}
            onChange={(e) => setEarlyAccessUntil(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            suppressHydrationWarning
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 transition"
          />
          <p className="text-xs text-gray-600 mt-1">Free users cannot read until this date passes. Leave blank for immediate public access.</p>
          {earlyAccessUntil && (
            <p className="text-xs text-yellow-400/70 mt-1">
              Free readers unlocked on {new Date(earlyAccessUntil).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
      )}

      {/* Status + Submit */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <div className="flex rounded-lg overflow-hidden border border-gray-700 text-sm shrink-0">
          <button
            type="button"
            onClick={() => { setStatus('DRAFT'); setScheduledAt(''); }}
            className={`px-4 py-2 transition ${status === 'DRAFT' ? 'bg-gray-700 text-white font-medium' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
          >
 Draft
          </button>
          <button
            type="button"
            onClick={() => { setStatus('PUBLISHED'); setScheduledAt(''); }}
            className={`px-4 py-2 transition ${status === 'PUBLISHED' ? 'bg-red-600 text-white font-medium' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
          >
 Publish
          </button>
          {/* SCHEDULED button — only shown once a publish date is set above */}
          {scheduledAt && (
            <button
              type="button"
              onClick={() => setStatus('SCHEDULED')}
              className={`px-4 py-2 transition ${status === 'SCHEDULED' ? 'bg-amber-600 text-white font-medium' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
            >
 Scheduled
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex-1 sm:flex-none px-8 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition text-sm"
        >
          {loading ? 'Saving...' : status === 'PUBLISHED' ? 'Publish Story' : status === 'SCHEDULED' ? 'Schedule Story' : 'Save Draft'}
        </button>
      </div>

    </form>
    </>
  );
}
