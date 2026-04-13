'use client';
// app/components/ui/TranslateStory.tsx
// Inline translation bar that lets readers translate a story into another language.
// The user picks a target language from a dropdown, clicks "Translate", and the
// story content (and optional excerpt) are sent to the /api/translate endpoint.
// The parent component receives the translated strings via onTranslated() and can
// swap out what it displays.  Clicking "Show original" reverses the swap via onReset().

import { useState } from 'react'; // useState — manages targetLang, loading, translated flag, and error
import { LANGUAGES } from '@/lib/languages'; // LANGUAGES — full list of supported language objects {code, flag, label, nativeLabel}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  originalContent: string;           // Raw HTML of the story body — sent to the translation API
  originalExcerpt?: string | null;   // Optional story excerpt — also translated if present
  storyLang: string;                 // BCP-47 code of the story's original language (e.g. "en")
  // Called with the translated HTML content and translated excerpt when translation succeeds
  onTranslated: (content: string, excerpt: string | null) => void;
  // Called when the user wants to revert back to the original language
  onReset: () => void;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TranslateStory({ originalContent, originalExcerpt, storyLang, onTranslated, onReset }: Props) {
  // targetLang — the language code the user wants to translate INTO (default: English)
  const [targetLang, setTargetLang] = useState('en');

  // loading — true while awaiting the translation API response
  const [loading, setLoading] = useState(false);

  // translated — true after a successful translation so we know to show "Show original" instead of "Translate"
  const [translated, setTranslated] = useState(false);

  // error — stores any error message returned by the translation API
  const [error, setError] = useState('');

  // availableLanguages — all languages except the story's own language (no point translating to itself)
  const availableLanguages = LANGUAGES.filter(l => l.code !== storyLang);

  // translate — calls /api/translate for the main content, then again for the excerpt if one exists
  const translate = async () => {
    setLoading(true); // show spinner on the Translate button
    setError('');     // clear any previous error

    try {
      // First request: translate the main story body
      const contentRes = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the raw HTML, target language, and the story's source language
        body: JSON.stringify({ text: originalContent, targetLang, sourceLang: storyLang }),
      });

      // Parse the JSON response from the translation API
      const contentData = await contentRes.json();

      // If the request failed, throw an error so we jump to the catch block
      if (!contentRes.ok) throw new Error(contentData.error);

      // translatedExcerpt — will hold the translated excerpt text (or null if no excerpt)
      let translatedExcerpt: string | null = null;

      // If the story has an excerpt, translate it as a separate API call
      if (originalExcerpt) {
        const excerptRes = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: originalExcerpt, targetLang, sourceLang: storyLang }),
        });
        const excerptData = await excerptRes.json();
        // Use the translated text, or null if the response didn't include one
        translatedExcerpt = excerptData.translated ?? null;
      }

      // Hand the translated strings up to the parent so it can re-render the story
      onTranslated(contentData.translated, translatedExcerpt);

      // Mark as translated so the UI switches to showing the "Show original" button
      setTranslated(true);
    } catch (err: unknown) {
      // Surface a human-readable error message in the UI
      setError(err instanceof Error ? err.message : 'Translation failed. Please try again.');
    }

    // Always clear the loading spinner whether we succeeded or failed
    setLoading(false);
  };

  // reset — reverts state and calls onReset() so the parent shows the original content
  const reset = () => { setTranslated(false); onReset(); };

  // activeLang — the full language object for the currently selected target language
  // (used to show the flag and label in the "Translated" confirmation badge)
  const activeLang = LANGUAGES.find(l => l.code === targetLang);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    // Flex row wrapping all controls — collapses gracefully on narrow screens
    <div className="flex flex-wrap items-center gap-3">

      {/* Globe / translate icon — purely decorative */}
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 0 1 6.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>

      {/* Label */}
      <span className="text-xs text-gray-500">Translate to:</span>

      {/* Language picker dropdown — filters out the story's source language */}
      <select
        value={targetLang}
        onChange={(e) => {
          // Update the selected language
          setTargetLang(e.target.value);
          // If the user changes the language while a translation is showing, reset the flag
          // so the "Translate" button reappears instead of "Show original"
          setTranslated(false);
        }}
        className="bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-600 transition"
      >
        {/* One <option> per supported language — shows flag, English name, and native name */}
        {availableLanguages.map((l) => (
          <option key={l.code} value={l.code}>{l.flag} {l.label} ({l.nativeLabel})</option>
        ))}
      </select>

      {/* Translate button OR Show Original button depending on current translated state */}
      {!translated ? (
        // ── Not yet translated: show the "Translate" button ──────────────────
        <button
          onClick={translate}  // triggers the API call
          disabled={loading}   // prevent double-clicks while the API is in-flight
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-red-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition"
        >
          {loading ? (
            // ── Loading state: spinning ring while awaiting the API ──────────
            <>
              {/* Animated SVG spinner */}
              <svg className="animate-spin w-3.5 h-3.5 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v8z"/>
              </svg>
              Translating…
            </>
          ) : 'Translate'} {/* Idle state: plain label */}
        </button>
      ) : (
        // ── Already translated: show the "Show original" revert button ───────
        <button
          onClick={reset} // reverts both local state and parent's displayed content
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 border border-red-600/30 hover:bg-red-600/20 text-red-400 text-xs font-medium rounded-lg transition"
        >
          Show original
        </button>
      )}

      {/* Success badge: shown after a successful translation to confirm what language is active */}
      {translated && activeLang && (
        <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-full">
          {activeLang.flag} Translated · {activeLang.label}
        </span>
      )}

      {/* Error message: displayed inline if the API call failed */}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
