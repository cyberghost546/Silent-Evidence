// app/api/reports/route.ts
// Handles user-submitted content reports.
// POST — authenticated users submit a report about a comment, story, forum post, or reply.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  // Read the session cookie to identify the reporter
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Only logged-in users can submit reports
  if (!userId) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  // Parse the incoming JSON body
  const { type, targetId, reason, note } = await req.json();

  // Basic validation — all required fields must be present
  if (!type || !targetId || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validate that type is one of the allowed enum values
  const allowedTypes = ['COMMENT', 'STORY', 'FORUM_POST', 'FORUM_REPLY'];
  if (!allowedTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  }

  // Validate that reason is one of the allowed enum values
  const allowedReasons = ['HARASSMENT', 'HATE_SPEECH', 'SPAM', 'INAPPROPRIATE', 'THREATS', 'OTHER'];
  if (!allowedReasons.includes(reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
  }

  // Create the report record in the database
  const report = await prisma.report.create({
    data: {
      type,
      targetId: Number(targetId),
      reason,
      // Optional extra note — trim whitespace, store null if empty
      note: note?.trim() || null,
      reporterId: userId,
    },
  });

  return NextResponse.json(report, { status: 201 });
}
