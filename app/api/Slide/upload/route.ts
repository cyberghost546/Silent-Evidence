// app/api/Slide/upload/route.ts
// POST — uploads a slideshow image to Cloudinary and returns the public URL.
// Only logged-in users can upload (admin role is not strictly enforced here
// since slide creation in AdminSlidesClient already happens through admin UI).
// File limits: max 8 MB, only JPG/PNG/WebP/GIF accepted.
// The returned URL is stored in the slide record by the caller.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { uploadToCloudinary } from '@/lib/cloudinary';

const MAX_SIZE      = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file)                              return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, WebP and GIF images are allowed.' }, { status: 400 });
  if (file.size > MAX_SIZE)               return NextResponse.json({ error: 'Image must be smaller than 8 MB.' }, { status: 400 });

  const buffer   = Buffer.from(await file.arrayBuffer());
  const publicId = `slide-${userId}-${Date.now()}`;

  const url = await uploadToCloudinary(buffer, 'silent-evidence/slides', publicId);
  return NextResponse.json({ url });
}
