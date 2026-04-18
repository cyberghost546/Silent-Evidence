// prisma/seed-users.ts
// Seeds 20 horror-themed sample users with profiles.
// All accounts use the password: Horror123!
// Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-users.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// All seeded accounts share this password for easy testing
const PASSWORD = 'Horror123!';

const users = [
  {
    username: 'MangaScribe',
    email: 'mangascribe@silentevidence.com',
    bio: 'Writing fan fiction since middle school. Shonen arcs are my specialty.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'SakuraPen',
    email: 'sakurapen@silentevidence.com',
    bio: 'Slice of life writer. Every quiet moment has a story worth telling.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'NeonSamurai',
    email: 'neonsamurai@silentevidence.com',
    bio: 'Cyberpunk meets bushido. My stories live in neon-lit alleyways.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'StardustOtaku',
    email: 'stardustotaku@silentevidence.com',
    bio: 'Isekai enthusiast. I have read every reincarnation story and I am still not tired.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'KitsuneTales',
    email: 'kitsunetales@silentevidence.com',
    bio: 'Folklore meets horror. My characters walk between two worlds.',
    role: 'USER' as const,
  },
  {
    username: 'MechaWriter',
    email: 'mechawriter@silentevidence.com',
    bio: 'If it has giant robots and dramatic cockpit scenes, I am writing it.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'TsunderePen',
    email: 'tsunderepen@silentevidence.com',
    bio: 'Romance writer. It is not like I wanted you to read my stories or anything.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'ShonenHeart',
    email: 'shonenheart@silentevidence.com',
    bio: 'The power of friendship is real. My stories prove it every chapter.',
    role: 'USER' as const,
  },
  {
    username: 'MoonlitSensei',
    email: 'moonlitsensei@silentevidence.com',
    bio: 'Dark fantasy writer. Beautiful worlds with dangerous secrets underneath.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'ChibiFox',
    email: 'chibifox@silentevidence.com',
    bio: 'Comedy and cute characters. Life is too short for stories without laughs.',
    role: 'USER' as const,
  },
  {
    username: 'RuneBlade',
    email: 'runeblade@silentevidence.com',
    bio: 'Fantasy worldbuilder. Every magic system I create has rules — and loopholes.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'SilverArrow',
    email: 'silverarrow@silentevidence.com',
    bio: 'Horror fiction changed my life. Now I write stories that push characters to their limits.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'CosmicInk',
    email: 'cosmicink@silentevidence.com',
    bio: 'Sci-fi and space opera. The universe is big enough for infinite stories.',
    role: 'USER' as const,
  },
  {
    username: 'YuukiDreams',
    email: 'yuukidreams@silentevidence.com',
    bio: 'Magical girl stories with heart. Transformation is more than just sparkles.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'PhantomQuill',
    email: 'phantomquill@silentevidence.com',
    bio: 'Psychological thriller writer. The twist is always closer than you think.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'RamenNinja',
    email: 'ramenninja@silentevidence.com',
    bio: 'School life and horror fiction enthusiast. The best scenes happen in the cafeteria.',
    role: 'USER' as const,
  },
  {
    username: 'AkiraVoid',
    email: 'akiravoid@silentevidence.com',
    bio: 'Seinen writer exploring what it means to grow up in a world that never stops changing.',
    role: 'USER' as const,
  },
  {
    username: 'CrystalMage',
    email: 'crystalmage@silentevidence.com',
    bio: 'I write fantasy because reality does not have enough magic systems.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'ZenithPilot',
    email: 'zenithpilot@silentevidence.com',
    bio: 'Mecha and military sci-fi. Every battle has a cost and every pilot has a story.',
    role: 'AUTHOR' as const,
  },
  {
    username: 'HanabiSpark',
    email: 'hanabispark@silentevidence.com',
    bio: 'Romance and drama. The best love stories are the ones that almost did not happen.',
    role: 'USER' as const,
  },
];

async function main() {
  console.log('Hashing password…');
  // Use the same salt rounds as the app (12) so passwords match login
  const hashed = await bcrypt.hash(PASSWORD, 12);

  console.log(`\nSeeding ${users.length} users (password: ${PASSWORD})\n`);

  for (const u of users) {
    // upsert on email so re-running the script never creates duplicates
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},   // already exists — skip
      create: {
        username: u.username,
        email:    u.email,
        password: hashed,
        role:     u.role,
        // Create the profile record inline
        profile: {
          create: {
            bio: u.bio,
            // Generate an avatar via DiceBear using the username as seed — green bg for horror theme
            avatar: `https://api.dicebear.com/8.x/personas/svg?seed=${encodeURIComponent(u.username)}&backgroundColor=22c55e`,
          },
        },
      },
    });
    console.log(`  ✓ ${user.role.padEnd(7)} — @${user.username}`);
  }

  console.log('\nDone! All users are ready.');
  console.log(`Login with any username above using password: ${PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
