import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { uploadToCloudinary } from '@/lib/cloudinary';

const MAX_SIZE     = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file)                            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Only JPG, PNG, WebP and GIF images are allowed.' }, { status: 400 });
  if (file.size > MAX_SIZE)             return NextResponse.json({ error: 'Image must be smaller than 5 MB.' }, { status: 400 });

  const buffer   = Buffer.from(await file.arrayBuffer());
  const publicId = `avatar-${userId}-${Date.now()}`;

  const url = await uploadToCloudinary(buffer, 'silent-evidence/avatars', publicId);
  return NextResponse.json({ url });
}
