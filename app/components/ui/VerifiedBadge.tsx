// VerifiedBadge.tsx
// Blue checkmark shown next to verified authors on their profile and stories.
// Styled to match the familiar verified account pattern.

export default function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  // Scale the badge based on context (sm = next to names, md = on profile hero)
  const cls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <svg
      className={`${cls} text-blue-400 inline-block flex-shrink-0`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Verified Author"
    >
      <title>Verified Author</title>
      {/* Solid circle background */}
      <circle cx="12" cy="12" r="12" className="text-blue-500" fill="currentColor" />
      {/* White checkmark */}
      <path
        fill="white"
        d="M9.86 18a1 1 0 0 1-.73-.32l-4.86-5.17a1 1 0 1 1 1.46-1.37l4.12 4.39 8.41-9.2a1 1 0 1 1 1.48 1.34l-9.14 10a1 1 0 0 1-.74.33z"
      />
    </svg>
  );
}
