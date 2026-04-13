'use client';
// SearchStories.tsx — client wrapper for the search results story list/grid toggle

import StoryViewToggle, { type StoryCard } from '@/app/components/ui/StoryViewToggle';

type Props = {
  stories: StoryCard[];
  paginationNode: React.ReactNode;
};

export default function SearchStories({ stories, paginationNode }: Props) {
  return <StoryViewToggle stories={stories} footer={paginationNode} />;
}
