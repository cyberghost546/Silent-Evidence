// app/admin/prompts/page.tsx
//
// Server Component — admin page for managing writing prompts.
//
// A "writing prompt" is a short creative challenge posted on the site to encourage
// community members to write and submit stories. This admin page lets the admin:
//   1. See the 5 most recent prompts and how many entries each received.
//   2. Generate a new AI-powered prompt with one click.
//   3. Set a prompt as the active/featured one.
//
// AUTH FLOW:
//   Cookie → userId → role === 'ADMIN'. Non-admins are redirected before any
//   database queries run.
//
// DATA FLOW:
//   The last 5 prompts are fetched here on the server so they're available on
//   first paint. `_count.entries` counts how many stories were submitted under
//   each prompt without loading the entries themselves. The results are passed to
//   AdminPromptsClient which handles AI generation and status changes via fetch().
//
// WHY JSON.parse(JSON.stringify(...))?
//   Prisma returns Date objects which cannot cross the server→client boundary in
//   Next.js. Converting through JSON turns them into plain ISO strings.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminPromptsClient from './AdminPromptsClient';

export default async function AdminPromptsPage() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const c = await cookies();
  const userId = Number(c.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') redirect('/');

  // ── Fetch recent prompts ──────────────────────────────────────────────────
  // The 5 most recent prompts, newest first.
  // `_count: { select: { entries: true } }` adds a virtual `_count.entries` field —
  // Prisma runs a COUNT(*) sub-query so we get the number without loading all entries.
  const prompts = await prisma.writingPrompt.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { _count: { select: { entries: true } } },
  });

  return <AdminPromptsClient initialPrompts={JSON.parse(JSON.stringify(prompts))} />;
}
