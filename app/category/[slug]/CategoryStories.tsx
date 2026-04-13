'use client';
/**
 * app/category/[slug]/CategoryStories.tsx
 *
 * WHAT THIS FILE DOES:
 * This is a thin "bridge" component that sits between the category Server Page
 * and the shared StoryViewToggle UI. It exists purely because Next.js does not
 * allow interactive client components (StoryViewToggle has useState for the
 * list/grid toggle) to be rendered directly inside a Server Component — you must
 * wrap them in a 'use client' file.
 *
 * HOW IT WORKS:
 * 1. The server page (app/category/[slug]/page.tsx) fetches stories from the DB.
 * 2. It passes them as props to <CategoryStories>.
 * 3. CategoryStories forwards them to <StoryViewToggle> which handles the
 *    list ↔ grid toggle entirely in the browser.
 * 4. The rendered <Pagination> component is passed as a React node ("paginationNode")
 *    so it appears below the story grid/list without needing extra prop drilling.
 *
 * HOW TO REUSE:
 * Any time you have a Server Component that needs to render an interactive
 * child, create a tiny 'use client' wrapper like this one. Pass the server-fetched
 * data as props and let the client component do all the interactivity.
 */

import StoryViewToggle, { type StoryCard } from '@/app/components/ui/StoryViewToggle';

type Props = {
  stories: StoryCard[];
  paginationNode: React.ReactNode;
};

export default function CategoryStories({ stories, paginationNode }: Props) {
  return <StoryViewToggle stories={stories} footer={paginationNode} />;
}
