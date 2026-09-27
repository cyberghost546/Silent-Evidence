// GET /api/admin/search?q=... — searches users, stories, comments
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const adminId = Number(cookieStore.get('userId')?.value ?? 0);
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { role: true } });
  if (!admin || admin.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const [users, stories, comments] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ username: { contains: q } }, { email: { contains: q } }] },
      take: 10,
      select: { id: true, username: true, email: true, role: true },
    }),
    prisma.story.findMany({
      where: { title: { contains: q } },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        author: { select: { username: true } },
      },
    }),
    prisma.comment.findMany({
      where: { content: { contains: q } },
      take: 10,
      select: {
        id: true,
        content: true,
        storyId: true,
        userId: true,
        user: { select: { username: true } },
      },
    }),
  ]);

  const results = [
    ...users.map((u) => ({
      type: 'user' as const,
      id: u.id,
      label: u.username,
      sub: `${u.email} · ${u.role}`,
      href: `/admin/users?id=${u.id}`,
    })),
    ...stories.map((s) => ({
      type: 'story' as const,
      id: s.id,
      label: s.title,
      sub: `by ${s.author.username} · ${s.status}`,
      href: `/story/${s.slug}`,
    })),
    ...comments.map((c) => ({
      type: 'comment' as const,
      id: c.id,
      label: c.content.slice(0, 80),
      sub: `by ${c.user.username}`,
      href: `/story/${c.storyId}`,
    })),
  ];

  return NextResponse.json({ results });
}
