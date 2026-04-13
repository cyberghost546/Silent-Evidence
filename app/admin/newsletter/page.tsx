// app/admin/newsletter/page.tsx
// Admin page for sending the weekly horror digest.
// Loads the preview data server-side to avoid a loading flash on mount.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { previewNewsletter } from '@/lib/sendNewsletter';
import AdminNewsletterClient from './AdminNewsletterClient';

export default async function AdminNewsletterPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') redirect('/');

  // Load preview data on the server so the client renders immediately
  const preview = await previewNewsletter();

  return <AdminNewsletterClient initialPreview={JSON.parse(JSON.stringify(preview))} />;
}
