// app/admin/verification/page.tsx
// Lists all pending verified-author applications and lets admins approve or reject them.
// Applications are stored as a JSON array in SiteSetting key "verification_requests".

import { prisma } from '@/lib/prisma';
import VerificationClient from './VerificationClient';

export default async function AdminVerificationPage() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'verification_requests' } });
  const requests: {
    userId: number; username: string; reason: string; links: string;
    submittedAt: string; status: string;
  }[] = setting ? JSON.parse(setting.value) : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Verification Requests</h1>
      <p className="text-gray-500 text-sm mb-8">
        Review applications for the blue verified checkmark. Approve to grant, reject to dismiss.
      </p>
      <VerificationClient requests={requests} />
    </div>
  );
}
