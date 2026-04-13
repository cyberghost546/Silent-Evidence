// app/admin/announcement/page.tsx
// Admin page to set or clear the site-wide announcement banner.
// Fetches the current message from the DB and renders the client form.

import { prisma } from '@/lib/prisma';
import AnnouncementAdmin from './AnnouncementAdmin';

export const metadata = { title: 'Announcement — Admin' };

export default async function AdminAnnouncementPage() {
  // Load the current banner message (or empty string if none is set)
  const row = await prisma.siteSetting.findUnique({ where: { key: 'announcement' } }).catch(() => null);
  return <AnnouncementAdmin current={row?.value ?? ''} />;
}
