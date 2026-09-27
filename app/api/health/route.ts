// Liveness/readiness probe for Railway (railway.json healthcheckPath) and uptime monitors.
// Returns 200 once the server is up and the database answers, 503 otherwise.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'db_unavailable' }, { status: 503 });
  }
}
