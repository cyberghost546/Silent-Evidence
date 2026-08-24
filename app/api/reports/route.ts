// app/api/reports/route.ts
// Handles user-submitted content reports.
// POST — authenticated users submit a report about a comment, story, forum post, or reply.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const CreateReportSchema = z.object({
  // Zod v4 replaced the `errorMap` option with `error`, which accepts the
  // message directly. The old key is no longer part of the params type.
  type:     z.enum(['COMMENT', 'STORY', 'FORUM_POST', 'FORUM_REPLY'], {
              error: 'Invalid report type',
            }),
  targetId: z.number().int().positive('A valid target ID is required.'),
  reason:   z.enum(['HARASSMENT', 'HATE_SPEECH', 'SPAM', 'INAPPROPRIATE', 'THREATS', 'OTHER'], {
              error: 'Invalid reason',
            }),
  note:     z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  // Read the session cookie to identify the reporter
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  // Only logged-in users can submit reports
  if (!userId) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  // Parse and validate the incoming JSON body
  const rawBody = await req.json();
  const parsed = CreateReportSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', issues: parsed.error.issues }, { status: 400 });
  }
  const { type, targetId, reason, note } = parsed.data;

  // Create the report record in the database
  const report = await prisma.report.create({
    data: {
      type,
      targetId,
      reason,
      // Optional extra note — trim whitespace, store null if empty
      note: note?.trim() || null,
      reporterId: userId,
    },
  });

  return NextResponse.json(report, { status: 201 });
}
