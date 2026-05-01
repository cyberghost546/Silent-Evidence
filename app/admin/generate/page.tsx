// app/admin/generate/page.tsx
//
// Server Component — fetches the category list from the DB, then renders the
// AI story generation UI via the GenerateTabs client component.
//
// PURPOSE:
//   Lets the admin generate AI-written horror stories using the Claude API.
//   The admin picks a category, optionally provides a prompt or tone, and
//   the AI returns a full draft that can be reviewed and published.
//
// WHY CATEGORIES ARE FETCHED HERE:
//   GenerateTabs needs the full list of categories to populate the dropdown.
//   We fetch it server-side (in this Server Component) rather than client-side
//   so the page renders immediately with the category data — no loading flash.
//   The `orderBy: { name: 'asc' }` keeps the dropdown alphabetically sorted.
//
// ACCESS:
//   Only reachable through the /admin layout, which enforces the ADMIN role check
//   before this component ever runs. No auth check needed here.

import { prisma } from '@/lib/prisma';
import GenerateTabs from './GenerateTabs';

export const metadata = { title: 'AI Story Generator — Admin' };

export default async function GeneratePage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  return <GenerateTabs categories={categories} />;
}
