// components/Slideshow.tsx
import { prisma } from '@/lib/prisma';
import SlideshowClient from './SlideshowClient';

export default async function Slideshow() {
  const slides = await prisma.slide.findMany({
    where: { active: true },         // only active slides
    orderBy: { order: 'asc' },       // respect admin ordering
  });

  return <SlideshowClient slides={slides} />;
}