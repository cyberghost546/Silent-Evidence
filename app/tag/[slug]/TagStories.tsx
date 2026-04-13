'use client';
// TagStories.tsx — client wrapper for the tag page story list/grid toggle

import StoryViewToggle, { type StoryCard } from '@/app/components/ui/StoryViewToggle';

export default function TagStories({ stories }: { stories: StoryCard[] }) {
  return <StoryViewToggle stories={stories} />;
}
