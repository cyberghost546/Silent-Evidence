// app/admin/slides/page.tsx
//
// Server Component — loads all homepage slideshow entries and passes them to the
// interactive AdminSlidesClient component.
//
// WHAT IS THE SLIDESHOW?
//   The homepage features a rotating banner that shows a series of "slides" — each
//   slide has an image, a title, and a link. This page lets the admin manage them:
//   add new slides, toggle which ones are visible, reorder them, and delete them.
//
// WHY ordered by `order: 'asc'`?
//   The `order` column stores an integer position (0, 1, 2…). Sorting by it here
//   means the client component receives the slides already in display order, so
//   it can render them without any extra sorting on the client.
//
// SERVER vs CLIENT SPLIT:
//   This file fetches the initial data (server work — can query DB).
//   AdminSlidesClient handles mutations like reordering, toggling active state,
//   and deleting slides, which require fetch() and useState ('use client' work).

import { prisma } from '@/lib/prisma';
import AdminSlidesClient from '@/app/components/ui/AdminSlidesClient';

export default async function AdminSlidesPage() {
  // Fetch all slides sorted by their display position.
  // `order: 'asc'` → 0 comes first (topmost slide), higher numbers follow.
  const slides = await prisma.slide.findMany({ orderBy: { order: 'asc' } });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Slideshow</h1>
      <p className="text-gray-500 text-sm mb-8">Manage the images that appear on the homepage.</p>
      {/*
        Pass the pre-fetched slides as a prop. AdminSlidesClient keeps a local
        copy in React state and updates it immediately after each mutation so the
        UI stays responsive without a full page reload.
      */}
      <AdminSlidesClient slides={slides} />
    </div>
  );
}
