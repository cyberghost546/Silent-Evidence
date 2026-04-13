// app/admin/prompts/page.tsx
// Admin page to view the current writing prompt and generate a new one via AI.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminPromptsClient from './AdminPromptsClient';

export default async function AdminPromptsPage() {
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') redirect('/');

  // Fetch the last 5 prompts for display
  const prompts = await prisma.writingPrompt.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { _count: { select: { entries: true } } },
  });

  return <AdminPromptsClient initialPrompts={JSON.parse(JSON.stringify(prompts))} />;
}
