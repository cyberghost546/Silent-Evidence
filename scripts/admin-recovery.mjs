#!/usr/bin/env node
// scripts/admin-recovery.mjs
//
// Server-side emergency admin tooling. Run it ON the server (or anywhere with the
// production DATABASE_URL and .env), never over the web. There is no HTTP route
// for any of this on purpose: access is gated by who can reach the machine and
// its secrets, not by a URL or a password an attacker could phish.
//
// This is the last-resort counterpart to the /api/auth/break-glass web flow.
// If the site is so broken that even break-glass will not load, this still works
// as long as the database is reachable.
//
// USAGE
//   node scripts/admin-recovery.mjs <command> [args]
//
// COMMANDS
//   list-admins                     Show every account with the ADMIN role.
//   ensure-owner                    Make sure the OWNER_EMAIL account exists as
//                                   ADMIN. Promotes it if it is not. Fails if no
//                                   such account exists (register it first).
//   promote <email>                 Give the account the ADMIN role.
//   demote  <email>                 Drop the account to USER (refuses the owner
//                                   and the last remaining admin).
//   reset-password <email>          Set a new password. Prompts for it (hidden),
//                                   or reads $NEW_PASSWORD if set.
//   recovery-codes <email>          Generate a fresh set of backup recovery codes
//                                   and print them ONCE. The old set is deleted.
//
// Every command that changes state writes an AuditLog row attributed to the
// affected account, tagged CLI, so the action is visible in the admin audit view.
//
// SAFETY
//   - Reads DATABASE_URL from the environment / .env, exactly like the app.
//   - Never prints password hashes or existing recovery codes (it cannot — only
//     hashes are stored).
//   - demote enforces the same owner / last-admin invariants as the web routes.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

// ── DB connection (mirrors lib/prisma.ts) ────────────────────────────────────
function makeClient() {
  const url = new URL(process.env.DATABASE_URL);
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
    }),
  });
}

// ── helpers ──────────────────────────────────────────────────────────────────
function ownerEmail() {
  const raw = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return raw || null;
}

function die(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\n  ✓ ${msg}\n`);
}

// Reads a line without echoing it, for password entry.
function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const onData = (char) => {
      const s = char.toString();
      if (s === '\n' || s === '\r' || s === '') process.stdin.removeListener('data', onData);
      else process.stdout.write('\x1b[2K\x1b[200D' + question); // keep prompt, hide input
    };
    process.stdout.write(question);
    process.stdin.on('data', onData);
    rl.question('', (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

function generateRecoveryCode() {
  const hex = randomBytes(6).toString('hex');
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}
const normalize = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

async function findByEmail(prisma, email) {
  const user = await prisma.user.findFirst({
    where: { email: email.trim() },
    select: { id: true, email: true, username: true, role: true },
  });
  if (!user) die(`No account found with email "${email}".`);
  return user;
}

async function audit(prisma, userId, action, detail) {
  await prisma.auditLog.create({
    data: { adminId: userId, action, detail: `[CLI] ${detail}`, targetType: 'User', targetId: userId },
  }).catch(() => {}); // never let an audit failure abort the recovery itself
}

// ── commands ─────────────────────────────────────────────────────────────────
async function cmdListAdmins(prisma) {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true, email: true, username: true, createdAt: true },
    orderBy: { id: 'asc' },
  });
  const owner = ownerEmail();
  console.log(`\n  ${admins.length} admin account(s):`);
  for (const a of admins) {
    const isOwner = owner && a.email.toLowerCase() === owner;
    console.log(`    #${a.id}  ${a.username}  <${a.email}>${isOwner ? '  ← OWNER' : ''}`);
  }
  console.log(owner ? `\n  OWNER_EMAIL = ${owner}\n` : '\n  OWNER_EMAIL is not set.\n');
}

async function cmdEnsureOwner(prisma) {
  const owner = ownerEmail();
  if (!owner) die('OWNER_EMAIL is not set. Set it in your environment first.');
  const user = await prisma.user.findFirst({
    where: { email: owner },
    select: { id: true, email: true, role: true },
  });
  if (!user) die(`No account exists for OWNER_EMAIL (${owner}). Register that account first, then re-run.`);
  if (user.role === 'ADMIN') return ok(`Owner ${owner} is already ADMIN. Nothing to do.`);
  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  await audit(prisma, user.id, 'CLI_ENSURE_OWNER', `Promoted owner ${owner} to ADMIN.`);
  ok(`Promoted owner ${owner} to ADMIN.`);
}

async function cmdPromote(prisma, email) {
  if (!email) die('Usage: promote <email>');
  const user = await findByEmail(prisma, email);
  if (user.role === 'ADMIN') return ok(`${user.email} is already ADMIN.`);
  await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  await audit(prisma, user.id, 'CLI_PROMOTE_ADMIN', `Promoted ${user.email} to ADMIN.`);
  ok(`Promoted ${user.email} to ADMIN.`);
}

async function cmdDemote(prisma, email) {
  if (!email) die('Usage: demote <email>');
  const user = await findByEmail(prisma, email);
  const owner = ownerEmail();
  if (owner && user.email.toLowerCase() === owner) die('Refusing to demote the owner account.');
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (user.role === 'ADMIN' && adminCount <= 1) die('Refusing to demote the only remaining admin.');
  await prisma.user.update({ where: { id: user.id }, data: { role: 'USER' } });
  await audit(prisma, user.id, 'CLI_DEMOTE_ADMIN', `Demoted ${user.email} to USER.`);
  ok(`Demoted ${user.email} to USER.`);
}

async function cmdResetPassword(prisma, email) {
  if (!email) die('Usage: reset-password <email>');
  const user = await findByEmail(prisma, email);
  const pw = process.env.NEW_PASSWORD ?? (await promptHidden('  New password (hidden): '));
  if (!pw || pw.length < 8) die('Password must be at least 8 characters.');
  const hash = await bcrypt.hash(pw, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, sessionVersion: { increment: 1 } },
  });
  await audit(prisma, user.id, 'CLI_RESET_PASSWORD', `Reset password for ${user.email}.`);
  ok(`Password reset for ${user.email}.`);
}

async function cmdRecoveryCodes(prisma, email) {
  if (!email) die('Usage: recovery-codes <email>');
  const user = await findByEmail(prisma, email);
  const plaintext = Array.from({ length: 10 }, generateRecoveryCode);
  const rows = await Promise.all(
    plaintext.map(async (code) => ({ userId: user.id, codeHash: await bcrypt.hash(normalize(code), 10) })),
  );
  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.recoveryCode.createMany({ data: rows }),
  ]);
  await audit(prisma, user.id, 'CLI_RECOVERY_CODES', `Generated 10 recovery codes for ${user.email}.`);
  console.log(`\n  New recovery codes for ${user.email} — store these offline, they are shown only once:\n`);
  for (const c of plaintext) console.log(`    ${c}`);
  console.log('\n  The previous set (if any) has been invalidated.\n');
}

// ── dispatch ─────────────────────────────────────────────────────────────────
async function main() {
  const [command, arg] = process.argv.slice(2);
  if (!command) {
    console.log('Usage: node scripts/admin-recovery.mjs <command> [args]');
    console.log('Commands: list-admins | ensure-owner | promote <email> | demote <email> | reset-password <email> | recovery-codes <email>');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) die('DATABASE_URL is not set.');

  const prisma = makeClient();
  try {
    switch (command) {
      case 'list-admins':    await cmdListAdmins(prisma); break;
      case 'ensure-owner':   await cmdEnsureOwner(prisma); break;
      case 'promote':        await cmdPromote(prisma, arg); break;
      case 'demote':         await cmdDemote(prisma, arg); break;
      case 'reset-password': await cmdResetPassword(prisma, arg); break;
      case 'recovery-codes': await cmdRecoveryCodes(prisma, arg); break;
      default: die(`Unknown command "${command}".`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
