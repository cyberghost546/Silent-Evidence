// app/admin/login-logs/page.tsx
// Security audit log — shows every login attempt recorded in the LoginLog table.
// Supports pagination (50 rows per page) via the ?page= query param.

import { prisma } from '@/lib/prisma';
import AdminLoginLogsClient from '@/app/components/ui/AdminLoginLogsClient';

const PAGE_SIZE = 50;

export default async function AdminLoginLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));

  const [logs, total] = await Promise.all([
    prisma.loginLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.loginLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Serialise dates to strings so the client component can receive them as props
  const serialised = logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Login Security Log</h1>
      <p className="text-gray-500 text-sm mb-8">
        Audit trail of every login attempt — {total.toLocaleString()} total entries, newest first.
      </p>
      <AdminLoginLogsClient
        logs={serialised}
        page={page}
        totalPages={totalPages}
        totalCount={total}
      />
    </div>
  );
}
