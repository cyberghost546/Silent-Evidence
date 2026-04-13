'use client';
/**
 * SpoilerText.tsx
 *
 * WHAT THIS FILE DOES:
 * Parses a comment string looking for [spoiler]...[/spoiler] tags and renders
 * the text inside those tags as a blurred, clickable span. The text is hidden
 * until the reader deliberately clicks on it to reveal it — preventing
 * accidental spoilers in comment sections.
 *
 * Plain text outside the tags is rendered as-is. Multiple spoiler tags in
 * one comment are each independently revealable.
 *
 * Example input:
 *   "The monster was [spoiler]actually the father[/spoiler] all along!"
 * Output:
 *   "The monster was [blurred clickable text] all along!"
 *
 * HOW TO REUSE IN A FUTURE PROJECT:
 * 1. Drop <SpoilerText text={comment.content} /> anywhere you render user text.
 * 2. The component handles all parsing internally — no pre-processing needed.
 * 3. Change the blur/colour classes on SpoilerSpan to match your theme.
 *
 * Example usage:
 *   <SpoilerText text="He was [spoiler]a ghost[/spoiler] the whole time." />
 */

import { useState } from 'react';

// SpoilerText — the public component.
// Takes the raw comment string and splits it into plain and spoiler segments.
export default function SpoilerText({ text }: { text: string }) {
  // The regex captures anything that looks like [spoiler]...[/spoiler].
  // The capturing group (...) inside split() means the matched strings are
  // included in the resulting array alongside the plain text segments.
  // e.g. "before [spoiler]secret[/spoiler] after"
  //   → ["before ", "[spoiler]secret[/spoiler]", " after"]
  const parts = text.split(/(\[spoiler\][\s\S]*?\[\/spoiler\])/gi);

  return (
    <>
      {parts.map((part, i) => {
        // Check if this segment is a spoiler tag
        const match = part.match(/^\[spoiler\]([\s\S]*?)\[\/spoiler\]$/i);

        if (match) {
          // match[1] is the captured content between the tags — pass it to SpoilerSpan
          return <SpoilerSpan key={i} content={match[1]} />;
        }

        // Plain text — render without any special treatment
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── SpoilerSpan ───────────────────────────────────────────────────────────────
// Renders a single spoiler section. Starts blurred; clicking reveals the text.
// Once revealed it stays revealed for the rest of the session (no way to re-hide).
function SpoilerSpan({ content }: { content: string }) {
  // revealed — false until the user clicks the span
  const [revealed, setRevealed] = useState(false);

  return (
    <span
      // setRevealed(true) on click — once revealed it stays revealed
      onClick={() => setRevealed(true)}
      // Tooltip tells the user what to do before they reveal
      title={revealed ? '' : 'Click to reveal spoiler'}
      className={`inline rounded px-0.5 transition-all cursor-pointer select-none ${
        revealed
          ? // Revealed: dark background, readable text, no blur
            'bg-gray-700 text-gray-200'
          : // Hidden: text is transparent + blurred so it's illegible; hover lightens slightly
            'bg-gray-600 text-transparent blur-sm hover:bg-gray-500'
      }`}
      // userSelect: none prevents accidentally copying the hidden text
      style={revealed ? {} : { userSelect: 'none' }}
    >
      {content}
    </span>
  );
}
