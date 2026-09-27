// lib/token.ts
//
// Hashing for high-entropy, single-use tokens (password reset, email
// verification) that are looked up by exact value.
//
// WHY SHA-256, NOT BCRYPT
//   bcrypt is for LOW-entropy secrets like passwords, where a slow hash is what
//   defeats brute force. A password-reset token is 256 bits of crypto-random
//   data — it cannot be brute-forced regardless of hash speed — and we need to
//   look it up by value, which a salted bcrypt hash cannot do (every hash is
//   different, so you cannot query for it). A fast, deterministic SHA-256 lets us
//   store only the hash, keep an indexed unique lookup, and ensure a database
//   leak reveals no usable token: the emailed raw token never touches the DB.

import { createHash } from 'crypto';

/** Deterministic SHA-256 hex digest of a token, for storage and lookup. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
