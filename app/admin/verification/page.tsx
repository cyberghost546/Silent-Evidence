// app/admin/verification/page.tsx
//
// Server Component — fetches the verification queue from the DB, then hands it
// to VerificationClient which handles the interactive approve/reject buttons.
//
// PURPOSE:
//   Authors can apply for a "verified" blue checkmark badge on their profile.
//   This page shows the admin every pending application so they can review the
//   author's reason and any links they provided, then approve or reject.
//
// HOW APPLICATIONS ARE STORED:
//   Verification requests are NOT a separate database table. Instead they are
//   stored as a JSON string in the key-value `SiteSetting` table under the
//   key `"verification_requests"`. This is the same pattern used for feature flags —
//   the setting's `value` column holds the serialised JSON array.
//
//   Storing this as JSON means:
//     - No migration needed to add a new request field
//     - Trade-off: can't query individual requests with Prisma filters — we load
//       all requests and filter in JavaScript
//
// SERVER/CLIENT SPLIT:
//   This Server Component does the one DB read and passes `requests` as a prop.
//   VerificationClient owns all interaction (approve/reject buttons, API calls,
//   optimistic UI removal of reviewed items).

import { prisma } from '@/lib/prisma';
import VerificationClient from './VerificationClient';

export default async function AdminVerificationPage() {
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'verification_requests' } });
  const requests: {
    userId: number;
    username: string;
    reason: string;
    links: string;
    submittedAt: string;
    status: string;
  }[] = setting?.value ? JSON.parse(setting.value) : [];

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
