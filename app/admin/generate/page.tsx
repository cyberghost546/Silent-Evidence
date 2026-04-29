// app/admin/generate/page.tsx
// Admin page — AI story generator tool.
// Fetches all categories from the DB so the GenerateTabs client component
// can let the admin pick a category when generating a story via the AI API.
// Only reachable through the admin layout, which enforces the ADMIN role.
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
