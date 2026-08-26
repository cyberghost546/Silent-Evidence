'use client';
// app/components/ui/StoryContent.tsx
// Renders a story's body content with an optional inline translation bar.
//
// The component owns two pieces of state — displayContent and displayExcerpt —
// which start as the original text but can be swapped out with translated versions
// when the reader uses the TranslateStory widget.  Clicking "Show original" inside
// that widget calls handleReset(), which restores the originals.
//
// Layout (top to bottom):
//   1. Excerpt (if present) — styled as a pull-quote with a red left border
//   2. Translation bar — always shown, lets readers pick a language
//   3. Story body — split on double-newline to create paragraph elements

import { useState } from 'react'; // useState — manages the currently displayed content / excerpt
import TranslateStory from './TranslateStory'; // TranslateStory — the language picker + translate/reset controls
import ReadingPreferences from './ReadingPreferences'; // per-reader font / size / spacing / theme controls
import StoryNarration from './StoryNarration'; // browser text-to-speech 'Listen' player

// Props passed in from the story page server component
type Props = {
  content: string; // raw HTML body of the story (from TipTap / the DB)
  excerpt?: string | null; // optional short description shown above the body
  storyLang?: string; // BCP-47 language code of the original story (default: 'en')
};

export default function StoryContent({ content, excerpt, storyLang = 'en' }: Props) {
  // displayContent — the story body that is currently shown.
  // Starts as the original content; updated to translated text when the user translates.
  const [displayContent, setDisplayContent] = useState(content);

  // displayExcerpt — the excerpt that is currently shown.
  // null when no excerpt exists; updated to translated excerpt when the user translates.
  const [displayExcerpt, setDisplayExcerpt] = useState(excerpt ?? null);

  // handleTranslated — called by TranslateStory when a translation succeeds.
  // Swaps both the body content and (if available) the excerpt with translated versions.
  const handleTranslated = (newContent: string, newExcerpt: string | null) => {
    setDisplayContent(newContent); // swap the body text to the translation
    if (newExcerpt) setDisplayExcerpt(newExcerpt); // also swap the excerpt if one was translated
  };

  // handleReset — called by TranslateStory when the user clicks "Show original".
  // Restores both the body and excerpt back to the values that came from the server.
  const handleReset = () => {
    setDisplayContent(content); // revert body to the original prop value
    setDisplayExcerpt(excerpt ?? null); // revert excerpt to the original prop value (or null)
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    // React Fragment — no extra wrapper div; the three sections sit directly in the parent's layout
    <>
      {/* ── 1. Excerpt pull-quote ────────────────────────────────────────────
          Only rendered when an excerpt exists; uses a red left border to visually
          distinguish it from the main story body.                              */}
      {displayExcerpt && (
        <p className="mt-6 text-lg text-gray-400 italic border-l-4 border-red-600 pl-4 leading-relaxed">
          {displayExcerpt}
        </p>
      )}

      {/* ── 2. Translation bar ──────────────────────────────────────────────
          Always visible so readers can translate at any time.
          The bar sits between two thin horizontal rules (border-y) to visually
          separate it from the excerpt above and the story body below.         */}
      <div className="my-6 flex items-center gap-3 py-3 border-y border-gray-800">
        <TranslateStory
          originalContent={content} // pass the ORIGINAL prop (not the translated state)
          originalExcerpt={excerpt} // pass the ORIGINAL excerpt so we can always re-translate
          storyLang={storyLang} // tells the picker which language to exclude from the dropdown
          onTranslated={handleTranslated} // called with translated strings on success
          onReset={handleReset} // called when user reverts to the original
        />
        {/* Listen (browser text-to-speech) and per-reader font / size / spacing /
            theme controls. Pushed to the right to share the toolbar row with the
            translation control. */}
        <div className="ml-auto flex items-center gap-2">
          <StoryNarration content={content} />
          <ReadingPreferences />
        </div>
      </div>

      {/* ── 3. Story body ───────────────────────────────────────────────────
          Content is stored as HTML (written in TipTap or seeded as HTML strings).
          dangerouslySetInnerHTML renders the HTML tags correctly instead of
          displaying them as raw text. The content comes from our own database
          (author-submitted or admin-seeded) so XSS risk is controlled at write time.
          prose prose-invert applies the Tailwind Typography stylesheet with
          white text suitable for dark backgrounds.                             */}
      {/* Reading surface. The CSS custom properties are set by ReadingPreferences;
          each has a fallback equal to the current styling, so with no preferences
          saved this renders exactly as before. The sepia/contrast themes paint a
          background, so we pad and round it only when a background is actually set. */}
      <div
        className="reading-surface rounded-lg transition-colors"
        style={{
          background: 'var(--reading-bg, transparent)',
          color: 'var(--reading-fg, inherit)',
          // --reading-pad is 0 in the default theme (so the layout is pixel-identical
          // to before) and non-zero when a themed background needs breathing room.
          padding: 'var(--reading-pad, 0)',
          maxWidth: 'var(--reading-width, none)',
          marginInline: 'auto',
        }}
      >
        <div
          className="prose prose-invert prose-lg max-w-none text-gray-200 leading-relaxed reading-body"
          style={{
            fontFamily: 'var(--reading-font, inherit)',
            fontSize: 'var(--reading-size, inherit)',
            lineHeight: 'var(--reading-leading, inherit)',
            // Let the themed foreground colour win over the prose text colour when set.
            color: 'var(--reading-fg, inherit)',
          }}
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />
      </div>
    </>
  );
}
