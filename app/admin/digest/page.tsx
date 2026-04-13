// app/admin/digest/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { previewCommentsDigest } from '@/lib/sendCommentsDigest';
import AdminDigestClient from './AdminDigestClient';

export default async function AdminDigestPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') redirect('/');

  const preview = await previewCommentsDigest();
  return <AdminDigestClient initialPreview={preview} />;
}
