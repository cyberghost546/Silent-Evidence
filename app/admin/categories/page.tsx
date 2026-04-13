// app/admin/categories/page.tsx
// Lists all categories with delete and add controls.

import { prisma } from '@/lib/prisma';
import AdminCategoriesClient from '@/app/components/ui/AdminCategoriesClient';

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { stories: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Categories</h1>
      <p className="text-gray-500 text-sm mb-8">{categories.length} categories</p>
      <AdminCategoriesClient categories={categories} />
    </div>
  );
}
