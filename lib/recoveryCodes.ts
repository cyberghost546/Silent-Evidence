// lib/recoveryCodes.ts
//
// Generates, stores and verifies single-use backup recovery codes.
//
// These codes are the fallback that keeps you from being permanently locked out:
// they let a user complete 2FA when they cannot receive the emailed code, and
// they are one of the two factors the break-glass owner-recovery flow requires.
//
// DESIGN
//   - A code looks like "4f3a-9c2e-7b1d" — three groups of hex, easy to read off
//     paper and unambiguous (no visually similar characters get introduced
//     because it is generated from raw bytes, then hex-encoded).
//   - Codes are generated with crypto.randomBytes, never Math.random.
//   - Only bcrypt hashes are stored. The plaintext exists only in the response
//     that creates them; we cannot show a code again, only replace the whole set.
//   - Verification is O(n) over the user's unused codes (there are ~10), and uses
//     bcrypt.compare, which is constant-time per comparison.
//
// This module does the crypto and persistence only. Who is allowed to generate
// or spend a code is decided by the routes that call it.

import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

/** How many codes a fresh set contains. */
export const RECOVERY_CODE_COUNT = 10;

/** bcrypt cost. Matches the project's password hashing so verification cost is predictable. */
const BCRYPT_ROUNDS = 10;

/**
 * Formats 6 random bytes as "xxxx-xxxx-xxxx". The dashes are cosmetic; they are
 * stripped again before hashing and comparison so a user who types the code
 * without them, or with spaces, still matches.
 */
function generateCode(): string {
  const hex = randomBytes(6).toString('hex'); // 12 hex chars
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

/** Normalises user input so formatting differences never cause a false reject. */
export function normalizeCode(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Replaces a user's recovery codes with a fresh set and returns the plaintext
 * codes to show once. Any previous codes are deleted, so old printouts stop
 * working the moment new ones are generated — the expected behaviour when a user
 * regenerates because they think the old set may be compromised.
 *
 * The delete and the inserts run in one transaction: a crash midway must not
 * leave the account with zero usable codes and no replacement shown to the user.
 */
export async function regenerateRecoveryCodes(userId: number): Promise<string[]> {
  const plaintext = Array.from({ length: RECOVERY_CODE_COUNT }, generateCode);

  // Hash the normalised form, so verification can normalise input and still match.
  const rows = await Promise.all(
    plaintext.map(async (code) => ({
      userId,
      codeHash: await bcrypt.hash(normalizeCode(code), BCRYPT_ROUNDS),
    }))
  );

  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({ where: { userId } }),
    prisma.recoveryCode.createMany({ data: rows }),
  ]);

  return plaintext;
}

/** How many unused recovery codes a user has left. */
export function countUnused(userId: number): Promise<number> {
  return prisma.recoveryCode.count({ where: { userId, used: false } });
}

/**
 * Verifies a submitted code against the user's unused codes and, on a match,
 * marks that code used so it can never be replayed.
 *
 * Returns true only if a code matched AND was successfully claimed. The claim is
 * a conditional update guarded on `used: false`, so two requests racing with the
 * same code can only have one of them win — the other updates zero rows and is
 * treated as a failure.
 */
export async function consumeRecoveryCode(userId: number, submitted: string): Promise<boolean> {
  const normalized = normalizeCode(submitted);
  if (!normalized) return false;

  const candidates = await prisma.recoveryCode.findMany({
    where: { userId, used: false },
    select: { id: true, codeHash: true },
  });

  for (const candidate of candidates) {
    if (await bcrypt.compare(normalized, candidate.codeHash)) {
      // Atomic claim: only succeeds if the row is still unused. updateMany
      // returns the number of rows changed, so a lost race yields 0.
      const claim = await prisma.recoveryCode.updateMany({
        where: { id: candidate.id, used: false },
        data: { used: true, usedAt: new Date() },
      });
      return claim.count === 1;
    }
  }

  return false;
}
