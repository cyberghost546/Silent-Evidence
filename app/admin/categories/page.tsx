// app/admin/categories/page.tsx
//
// Server Component — loads the full category list from the database and hands
// it to the interactive AdminCategoriesClient component.
//
// WHY a Server Component here?
//   This page only needs to READ data on first load. The Server Component fetches
//   it at request time and passes it as props so the Client Component has the data
//   immediately — no loading spinner, no extra fetch on mount.
//
// WHY AdminCategoriesClient is separate?
//   The add/delete mutations require useState and fetch(), which only work in
//   Client Components ('use client'). Splitting lets each file do what it's good at.
//
// Data model:
//   Category { id, name, stories (relation) }
//   The `_count` include tells Prisma to add a virtual `_count.stories` field to
//   each row — the count of stories assigned to that category — without fetching
//   all the story records themselves. This is the Prisma equivalent of a
//   LEFT JOIN + COUNT(*) GROUP BY in SQL, but much less code.

import { prisma } from '@/lib/prisma';
import AdminCategoriesClient from '@/app/components/ui/AdminCategoriesClient';

export default async function AdminCategoriesPage() {
  // Fetch every category, sorted A→Z so the list is easy to scan visually.
  // `include: { _count: { select: { stories: true } } }` adds a story count
  // to each category row — used by the client component to show "X stories"
  // next to each category name and to prevent deleting categories that still
  // have stories attached.
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { stories: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Categories</h1>
      {/* Live count from the fetched array — no extra DB query needed */}
      <p className="text-gray-500 text-sm mb-8">{categories.length} categories</p>
      {/*
        Pass the category list as a prop. AdminCategoriesClient will:
          1. Render the list with per-category story counts.
          2. Let the admin add new categories (POST /api/admin/categories).
          3. Let the admin delete empty categories (DELETE /api/admin/categories).
        It keeps a local copy in React state and updates it after each mutation
        so the UI stays in sync without a full page reload.
      */}
      <AdminCategoriesClient categories={categories} />
    </div>
  );
}
