// app/admin/slides/page.tsx
// Manage the homepage slideshow — add, toggle active, reorder, delete.

import { prisma } from '@/lib/prisma';
import AdminSlidesClient from '@/app/components/ui/AdminSlidesClient';

export default async function AdminSlidesPage() {
  const slides = await prisma.slide.findMany({ orderBy: { order: 'asc' } });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Slideshow</h1>
      <p className="text-gray-500 text-sm mb-8">Manage the images that appear on the homepage.</p>
      <AdminSlidesClient slides={slides} />
    </div>
  );
}
