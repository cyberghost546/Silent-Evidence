// app/admin/reports/page.tsx
// Admin page that lists all user-submitted content reports.
// Admins can mark reports as REVIEWED or DISMISSED directly from this page.

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
