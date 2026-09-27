'use client';
// app/components/ui/WordCountBadge.tsx
// Strips HTML from a story's content, counts words, and displays a
// human-friendly "X,XXX words · Y min read" badge. Uses 200 wpm as the
// average reading speed, which is a commonly accepted benchmark.

type Props = {
  content: string; // raw HTML content of the story
  className?: string; // optional extra Tailwind classes from the parent
};

// READING_SPEED — average adult reading speed in words per minute
const READING_SPEED = 200;

// stripHtml — removes HTML tags and collapses whitespace to get raw text
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ') // replace every tag with a space
    .replace(/&nbsp;/g, ' ') // non-breaking spaces → regular space
    .replace(/\s+/g, ' ') // collapse multiple spaces/newlines
    .trim();
}

export default function WordCountBadge({ content, className = '' }: Props) {
  // Split plain text on whitespace to get an array of words, filter empties
  const words = stripHtml(content).split(/\s+/).filter(Boolean);
  const count = words.length;

  // Calculate read time, rounded up so we never show "0 min"
  const minutes = Math.max(1, Math.ceil(count / READING_SPEED));

  // Format with locale thousands-separator: 1234 → "1,234"
  const formatted = count.toLocaleString();

  return (
    // Inline span — drop it anywhere in a story header or card
    <span className={`text-sm text-gray-500 ${className}`}>
      {formatted} words · {minutes} min read
    </span>
  );
}
