// app/api/Slide/upload/route.ts
// POST — receives an uploaded slide image, saves it to public/uploads/slides/,
// and returns the public URL so the admin slide form can use it.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Max file size: 8 MB
const MAX_SIZE = 8 * 1024 * 1024;

// Only allow common image formats
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: Request) {
  // Only logged-in users (admins) can upload slide images
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WebP and GIF images are allowed.' }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Image must be smaller than 8 MB.' }, { status: 400 });
  }

  // Read the file into a buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Build a unique filename using the user ID and a timestamp
  const ext      = file.type.split('/')[1].replace('jpeg', 'jpg');
  const filename = `${userId}-${Date.now()}.${ext}`;

  // Save to public/uploads/slides/ so Next.js serves it at /uploads/slides/filename
  const uploadDir = join(process.cwd(), 'public', 'uploads', 'slides');
  await mkdir(uploadDir, { recursive: true });
  await writeFile(join(uploadDir, filename), buffer);

  // Return the public URL
  const url = `/uploads/slides/${filename}`;
  return NextResponse.json({ url });
}
