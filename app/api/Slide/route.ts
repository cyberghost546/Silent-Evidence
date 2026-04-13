// app/api/slides/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

async function isAdmin() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN';
}

// GET — fetch all slides (public)
export async function GET() {
  const slides = await prisma.slide.findMany({ orderBy: { order: 'asc' } });
  return NextResponse.json(slides);
}

// POST — add a slide (admin only)
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  const { title, subtitle, image, linkUrl, order, active } = await req.json();

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }
  if (!image || typeof image !== 'string' || image.trim().length === 0) {
    return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
  }

  const slide = await prisma.slide.create({
    data: {
      title: title.trim().slice(0, 200),
      subtitle: subtitle ? String(subtitle).trim().slice(0, 300) : null,
      image: image.trim().slice(0, 500),
      linkUrl: linkUrl ? String(linkUrl).trim().slice(0, 500) : null,
      order: Number(order) || 0,
      active: active ?? true,
    },
  });
  return NextResponse.json(slide);
}
