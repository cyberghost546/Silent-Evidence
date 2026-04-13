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
