import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { uploadToCloudinary } from '@/lib/cloudinary';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  // Auth — must be logged in
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, WebP, and GIF files are allowed' },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 });
  }

  const id = randomBytes(12).toString('hex');
  const buffer = Buffer.from(await file.arrayBuffer());

  // Hosted deploys (Vercel's read-only FS, Railway's ephemeral container) can't
  // keep files on local disk, so store in Cloudinary whenever it is configured.
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    const url = await uploadToCloudinary(buffer, 'silent-evidence/uploads', id);
    return NextResponse.json({ url });
  }
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Image uploads are not configured' }, { status: 503 });
  }

  // Local development fallback — write into public/uploads.
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const filename = `${id}.${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}
