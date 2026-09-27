// tests/search.test.ts
// Unit tests for the search query parser in lib/search.ts.
//
// parseSearchQuery is the security-sensitive part of full-text search: whatever
// a reader types ends up inside a MariaDB boolean-mode expression, where
// characters like + - * " ( ) ~ < > are operators. The parser must strip all of
// them, so these tests focus on escaping and on the min-token-size rules that
// decide whether a query can use the index at all.

import { describe, it, expect, vi } from 'vitest';

// lib/search.ts imports the Prisma client at module load, which would try to
// read DATABASE_URL and open a connection pool. The parser needs neither.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { parseSearchQuery } from '@/lib/search';

describe('parseSearchQuery', () => {
  it('requires every word and allows suffixes', () => {
    const parsed = parseSearchQuery('haunted lighthouse');
    expect(parsed.strict).toBe('+haunted* +lighthouse*');
    expect(parsed.loose).toBe('haunted* lighthouse*');
    expect(parsed.usable).toBe(true);
  });

  it('drops words shorter than the index minimum and reports them', () => {
    const parsed = parseSearchQuery('it is a ghost');
    expect(parsed.strict).toBe('+ghost*');
    expect(parsed.ignored).toEqual(['it', 'is', 'a']);
    expect(parsed.usable).toBe(true);
  });

  it('is unusable when no word is long enough to be indexed', () => {
    const parsed = parseSearchQuery('it is a');
    expect(parsed.usable).toBe(false);
    expect(parsed.strict).toBe('');
  });

  it('keeps quoted text together as a phrase match', () => {
    const parsed = parseSearchQuery('"the census taker"');
    expect(parsed.strict).toBe('+"the census taker"');
    expect(parsed.loose).toBe('"the census taker"');
  });

  it('handles a phrase alongside loose words', () => {
    const parsed = parseSearchQuery('"last call" diner');
    expect(parsed.strict).toBe('+"last call" +diner*');
  });

  it('ignores a phrase made entirely of short words', () => {
    const parsed = parseSearchQuery('"in a" cabin');
    expect(parsed.strict).toBe('+cabin*');
    expect(parsed.ignored).toContain('in a');
  });

  // ── Escaping ───────────────────────────────────────────────────────────────
  // Each of these would change the meaning of the SQL expression if it survived.

  it('strips boolean-mode operators instead of executing them', () => {
    const parsed = parseSearchQuery('cabin -woods +blood');
    // The - and + are treated as separators, not as exclude/require operators.
    expect(parsed.strict).toBe('+cabin* +woods* +blood*');
  });

  it('neutralises wildcards, grouping and proximity characters', () => {
    const parsed = parseSearchQuery('ghost* (manor ~house) <weight> @dist');
    expect(parsed.strict).toBe('+ghost* +manor* +house* +weight* +dist*');
  });

  it('does not let an unbalanced quote leak into the expression', () => {
    // An odd number of quotes must not produce an unterminated phrase — that
    // would be a syntax error inside AGAINST(), not a failed search.
    const parsed = parseSearchQuery('cabin" UNION SELECT');
    expect(parsed.strict).not.toContain('"');
    expect(parsed.strict).toBe('+cabin* +UNION* +SELECT*');
  });

  it('removes backslashes and semicolons', () => {
    const parsed = parseSearchQuery('cabin\\; DROP TABLE Story;');
    expect(parsed.strict).toBe('+cabin* +DROP* +TABLE* +Story*');
  });

  it('produces nothing usable from punctuation alone', () => {
    const parsed = parseSearchQuery('*** +++ """');
    expect(parsed.usable).toBe(false);
    expect(parsed.strict).toBe('');
  });

  it('handles an empty query', () => {
    const parsed = parseSearchQuery('');
    expect(parsed.usable).toBe(false);
    expect(parsed.ignored).toEqual([]);
  });

  // ── Real-world text ────────────────────────────────────────────────────────

  it('keeps apostrophes inside words but trims them at the edges', () => {
    const parsed = parseSearchQuery("don't 'quoted'");
    expect(parsed.strict).toBe("+don't* +quoted*");
  });

  it('supports non-ASCII letters', () => {
    const parsed = parseSearchQuery('mansión café');
    expect(parsed.strict).toBe('+mansión* +café*');
  });

  it('keeps digits', () => {
    const parsed = parseSearchQuery('room 237');
    expect(parsed.strict).toBe('+room* +237*');
  });
});
