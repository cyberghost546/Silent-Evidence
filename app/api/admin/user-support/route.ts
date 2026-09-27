import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mailer';
import bcrypt from 'bcryptjs';

async function requireAdmin() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'ADMIN' ? userId : null;
}

function randomPassword(length = 12) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// GET /api/admin/user-support?q=username_or_email
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  const user = await prisma.user.findFirst({
    where: {
      // No `mode: 'insensitive'` — that filter is Postgres/Mongo only and is a
      // type error on MySQL. It isn't needed here either: these columns use the
      // utf8mb4_unicode_ci collation, which already compares case-insensitively.
      OR: [{ username: { equals: q } }, { email: { equals: q } }],
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      emailVerified: true,
      isVerified: true,
      isBanned: true,
      suspendedUntil: true,
      createdAt: true,
      _count: { select: { stories: true, userWarnings: true } },
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json(user);
}

// POST /api/admin/user-support
// Body: { action, userId, ...extras }
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { action, userId } = body as {
    action: string;
    userId: number;
    subject?: string;
    message?: string;
  };

  if (!action || !userId)
    return NextResponse.json({ error: 'Missing action or userId' }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      isBanned: true,
      suspendedUntil: true,
      sessionVersion: true,
    },
  });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // ── Reset password ────────────────────────────────────────────────────────
  if (action === 'reset_password') {
    const tempPass = randomPassword();
    const hashed = await bcrypt.hash(tempPass, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, sessionVersion: { increment: 1 } },
    });

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#e5e7eb;background:#111827;padding:32px;border-radius:12px">
        <h2 style="color:#ef4444;margin-top:0">Password Reset</h2>
        <p>Hi <strong>${target.username}</strong>,</p>
        <p>An administrator has reset your account password. Your temporary password is:</p>
        <div style="background:#1f2937;border:1px solid #374151;border-radius:8px;padding:16px;text-align:center;margin:20px 0">
          <code style="font-size:22px;color:#f9fafb;letter-spacing:2px">${tempPass}</code>
        </div>
        <p>Please log in and change your password immediately in your account settings.</p>
        <p style="color:#6b7280;font-size:13px">If you did not request this, please contact us right away.</p>
      </div>`;

    const sent = await sendMail({
      to: target.email,
      subject: 'Your password has been reset',
      html,
    });
    await prisma.emailLog.create({
      data: {
        to: target.email,
        subject: 'Your password has been reset',
        type: 'password-reset',
        status: sent ? 'sent' : 'failed',
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Temporary password emailed to ${target.email}`,
    });
  }

  // ── Send advice / custom message ─────────────────────────────────────────
  if (action === 'send_advice') {
    const { subject, message } = body as { subject: string; message: string };
    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#e5e7eb;background:#111827;padding:32px;border-radius:12px">
        <h2 style="color:#ef4444;margin-top:0">Message from Silent Evidence Support</h2>
        <p>Hi <strong>${target.username}</strong>,</p>
        <div style="background:#1f2937;border:1px solid #374151;border-radius:8px;padding:20px;margin:16px 0;white-space:pre-wrap;line-height:1.6">
          ${message.replace(/\n/g, '<br>')}
        </div>
        <p style="color:#6b7280;font-size:13px">This message was sent by the Silent Evidence admin team.</p>
      </div>`;

    const sent = await sendMail({ to: target.email, subject, html });
    await prisma.emailLog.create({
      data: { to: target.email, subject, type: 'admin-advice', status: sent ? 'sent' : 'failed' },
    });

    if (!sent) return NextResponse.json({ error: 'Email failed to send' }, { status: 500 });
    return NextResponse.json({ ok: true, message: `Message sent to ${target.email}` });
  }

  // ── Lift ban ──────────────────────────────────────────────────────────────
  if (action === 'unban') {
    await prisma.user.update({ where: { id: userId }, data: { isBanned: false } });
    return NextResponse.json({ ok: true, message: `${target.username} has been unbanned` });
  }

  // ── Lift suspension ───────────────────────────────────────────────────────
  if (action === 'unsuspend') {
    await prisma.user.update({ where: { id: userId }, data: { suspendedUntil: null } });
    return NextResponse.json({
      ok: true,
      message: `${target.username}'s suspension has been lifted`,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
