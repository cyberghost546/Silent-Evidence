// prisma/grandfather-authors.ts
// Grants free, permanent Author Pro access to writers who were already using
// what are now Author Pro features, before the paywall existed.
//
// Run it ONCE, at the same time you deploy the Author Pro gates:
//   npm run db:grandfather-authors
//
// Without this, the day you deploy, every author with a priced story, a premium-
// only story, an early-access window, or audio/video/soundtrack attached would
// suddenly be unable to edit their own live work. This script finds them and
// sets User.authorGrandfathered = true, which lib/authorPro.ts treats as
// equivalent to a paid plan.
//
// Safe to re-run: it only ever sets the flag to true and reports what changed.
// Pass --dry-run to see who would be affected without writing anything.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function parseDbUrl() {
  const url = new URL(process.env.DATABASE_URL!);
  return {
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  };
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(parseDbUrl()) });

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(
    dryRun ? 'DRY RUN — no changes will be written.\n' : 'Grandfathering existing authors...\n'
  );

  // Any author with at least one story using a now-gated feature. Mirrors
  // AUTHOR_PRO_STORY_FIELDS in lib/authorPro.ts — keep the two in step.
  const stories = await prisma.story.findMany({
    where: {
      OR: [
        { price: { gt: 0 } },
        { isPremiumOnly: true },
        { earlyAccessUntil: { not: null } },
        { audioUrl: { not: null } },
        { videoUrl: { not: null } },
        { spotifyPlaylistUrl: { not: null } },
      ],
    },
    select: { authorId: true },
    distinct: ['authorId'],
  });

  // Authors who already built bundles under the old admin-only flow are counted
  // too, in case any were created on an author's behalf.
  const bundles = await prisma.storyBundle.findMany({
    where: { authorId: { not: null } },
    select: { authorId: true },
    distinct: ['authorId'],
  });

  const ids = new Set<number>();
  for (const s of stories) ids.add(s.authorId);
  for (const b of bundles) if (b.authorId) ids.add(b.authorId);

  if (ids.size === 0) {
    console.log('No authors are using Author Pro features yet — nothing to do.');
    return;
  }

  const users = await prisma.user.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, username: true, authorGrandfathered: true },
  });

  const toUpdate = users.filter((u) => !u.authorGrandfathered);

  for (const u of users) {
    console.log(
      u.authorGrandfathered
        ? `  · @${u.username} (id ${u.id}) — already grandfathered`
        : `  ✓ @${u.username} (id ${u.id})`
    );
  }

  if (!dryRun && toUpdate.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: toUpdate.map((u) => u.id) } },
      data: { authorGrandfathered: true },
    });
  }

  console.log(
    `\n${ids.size} author(s) use Author Pro features. ` +
      (dryRun
        ? `${toUpdate.length} would be granted access.`
        : `${toUpdate.length} newly granted, ${users.length - toUpdate.length} already had it.`)
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
