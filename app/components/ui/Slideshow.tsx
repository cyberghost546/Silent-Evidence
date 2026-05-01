// app/components/ui/Slideshow.tsx
// Server component — fetches active slides ordered by the admin-set `order` field
// and passes them to SlideshowClient for the carousel animation. Split into server
// + client so the DB query stays on the server while the carousel JS runs in the browser.
import { prisma } from '@/lib/prisma';
import SlideshowClient from './SlideshowClient';

export default async function Slideshow() {
  const slides = await prisma.slide.findMany({
    where: { active: true },         // only active slides
    orderBy: { order: 'asc' },       // respect admin ordering
  });

  return <SlideshowClient slides={slides} />;
}