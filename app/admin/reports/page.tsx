// app/admin/reports/page.tsx
//
// Server Component — fetches all content reports and passes them to AdminReportsClient.
//
// PURPOSE:
//   Content moderation queue. When a user clicks "Report" on a story or comment,
//   a Report record is created. This page surfaces all pending reports so the admin
//   can review them and take action (mark REVIEWED or DISMISS).
//
// PRISMA GUARD:
//   `if (!(prisma as any).report)` — defensive check for when the Report model was
//   added to the schema but `prisma generate` hasn't been run yet. Without regenerating,
//   `prisma.report` would be undefined and calling `.findMany()` would throw.
//   This guard shows a friendly error with instructions instead of crashing.
//   In production this situation should never happen; it's a development-time safeguard.
//
// SERIALIZATION:
//   `r.createdAt.toISOString()` converts the Prisma Date to an ISO string manually
//   (instead of the usual JSON.parse/stringify round-trip). Both approaches work;
//   `.toISOString()` is explicit and slightly more readable for a single field.
//
// The actual approve/reject buttons live in AdminReportsClient — see that file
// for the interaction pattern (optimistic status updates, per-row loading state).

import { prisma } from '@/lib/prisma';
import AdminReportsClient from './AdminReportsClient';
import { AlertTriangle } from 'lucide-react';

export default async function AdminReportsPage() {
  // Guard: if prisma.report is undefined the Prisma client hasn't been regenerated yet.
  // This happens when the schema was changed but `prisma generate` hasn't been run.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(prisma as any).report) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-4">Content Reports</h1>
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-6 text-yellow-300 text-sm">
          <p className="font-semibold mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Prisma client needs regenerating</p>
          <p>Stop your dev server, run <code className="bg-gray-800 px-1 rounded">npx prisma generate</code>, then restart with <code className="bg-gray-800 px-1 rounded">npm run dev</code>.</p>
        </div>
      </div>
    );
  }

  // Fetch all reports from the database, newest first
  // Include the reporter's username so we know who filed each one
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { username: true } },
    },
  });

  // Serialise dates to strings so the data can be passed to a client component
  const serialised = reports.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Content Reports</h1>
      <p className="text-sm text-gray-400 mb-8">
        Review reports submitted by users about offensive or harmful content.
      </p>
      <AdminReportsClient reports={serialised} />
    </div>
  );
}
