// prisma/seed.ts
// Seeds the database with default horror categories and homepage slideshow slides.
// Run it with: npx prisma db seed

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

function parseDbUrl() {
  const url = new URL(process.env.DATABASE_URL!);
  return {
    host:     url.hostname,
    port:     parseInt(url.port, 10) || 3306,
    user:     url.username,
    password: url.password,
    database: url.pathname.slice(1),
  };
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(parseDbUrl()),
});

// ─────────────────────────────────────────────
//  CATEGORIES
//  Horror sub-genres shown in the site navigation.
// ─────────────────────────────────────────────
const categories = [
  {
    name: 'True Crime',
    slug: 'true-crime',
    description: 'Real cases, unsolved murders, cold cases, and the people who lived them.',
  },
  {
    name: 'Paranormal',
    slug: 'paranormal',
    description: 'Personal encounters with ghosts, demons, and things that defy explanation.',
  },
  {
    name: 'Haunted Locations',
    slug: 'haunted-locations',
    description: 'Houses, hospitals, forests, and towns where something refuses to leave.',
  },
  {
    name: 'Unexplained Disappearances',
    slug: 'unexplained-disappearances',
    description: 'People who vanished without a trace — and the questions that remain.',
  },
  {
    name: 'Campfire Stories',
    slug: 'campfire-stories',
    description: 'The kind of story you tell in the dark — passed down, whispered, never forgotten.',
  },
  {
    name: 'Sleep Paralysis',
    slug: 'sleep-paralysis',
    description: 'Waking up frozen, seeing figures in the dark, unable to scream.',
  },
  {
    name: 'Stalker Stories',
    slug: 'stalker-stories',
    description: 'Real accounts of being followed, watched, and hunted.',
  },
  {
    name: 'Urban Legends',
    slug: 'urban-legends',
    description: 'The stories your town tells. Some of them are true.',
  },
  {
    name: 'Cults & Rituals',
    slug: 'cults-and-rituals',
    description: 'Survivor accounts and investigations into manipulative groups.',
  },
  {
    name: 'Witness Accounts',
    slug: 'witness-accounts',
    description: 'First-hand testimonies of events the author cannot explain.',
  },
  {
    name: 'Serial Killers',
    slug: 'serial-killers',
    description: 'Profiles, investigations, and the victims who deserve to be remembered.',
  },
  {
    name: 'Cursed Objects',
    slug: 'cursed-objects',
    description: 'Items that brought misfortune, illness, or death to everyone who owned them.',
  },
  {
    name: 'Near Death Experiences',
    slug: 'near-death-experiences',
    description: 'What people saw, heard, and felt at the edge of death.',
  },
  {
    name: 'Cryptids & Creatures',
    slug: 'cryptids-and-creatures',
    description: 'Bigfoot, Skinwalkers, the Mothman — encounters with things that should not exist.',
  },
  {
    name: 'Psychological Horror',
    slug: 'psychological-horror',
    description: 'Gaslighting, manipulation, and the monsters hiding in plain sight.',
  },
  {
    name: 'Disaster & Survival',
    slug: 'disaster-and-survival',
    description: 'Survivors of accidents, natural disasters, and human-caused catastrophes.',
  },
  {
    name: 'Conspiracy',
    slug: 'conspiracy',
    description: 'Unexplained cover-ups, missing evidence, and questions nobody will answer.',
  },
  {
    name: 'Occult & Witchcraft',
    slug: 'occult-and-witchcraft',
    description: 'Rituals gone wrong, dark magic, and those who dabble in the forbidden.',
  },
  {
    name: 'Medical Horror',
    slug: 'medical-horror',
    description: 'Misdiagnoses, experimental procedures, and the horrors of the operating table.',
  },
  {
    name: 'Childhood Trauma',
    slug: 'childhood-trauma',
    description: 'The frightening things that happened when we were small — and stayed with us.',
  },
];

// ─────────────────────────────────────────────
//  SLIDES
//  Homepage hero slideshow content.
// ─────────────────────────────────────────────
const slides = [
  {
    title: 'The Night I Followed the Wrong Car Home',
    subtitle: 'I did not realize until I pulled into my driveway that the car behind me had been there for forty minutes.',
    image: 'https://picsum.photos/seed/horror-road/1200/500',
    linkUrl: null,
    order: 1,
    active: true,
  },
  {
    title: 'Room 14 at the Motel Off Route 9',
    subtitle: 'The door had been nailed shut from the inside. The owner said it had always been that way.',
    image: 'https://picsum.photos/seed/horror-motel/1200/500',
    linkUrl: null,
    order: 2,
    active: true,
  },
  {
    title: 'My Grandmother Knew She Was Going to Die',
    subtitle: 'She told everyone at breakfast. She was calm. She was right.',
    image: 'https://picsum.photos/seed/horror-house/1200/500',
    linkUrl: null,
    order: 3,
    active: true,
  },
  {
    title: 'The Hiker Who Came Back From Zion',
    subtitle: 'He could not explain the three days he could not account for. Neither could the doctors.',
    image: 'https://picsum.photos/seed/horror-forest/1200/500',
    linkUrl: null,
    order: 4,
    active: true,
  },
  {
    title: 'We Found the Recordings in the Wall',
    subtitle: 'Whoever lived here before us had been documenting something. We wish we had not listened.',
    image: 'https://picsum.photos/seed/horror-dark/1200/500',
    linkUrl: null,
    order: 5,
    active: true,
  },
];

async function main() {
  // ── Seed categories ──────────────────────────────────────────
  console.log('Seeding horror categories...');

  for (const category of categories) {
    await prisma.category.upsert({
      where:  { slug: category.slug },
      update: {},
      create: category,
    });
    console.log(`  ✓ ${category.name}`);
  }

  // ── Seed slides ───────────────────────────────────────────────
  console.log('\nSeeding homepage slides...');

  for (const slide of slides) {
    await prisma.slide.upsert({
      where:  { id: slide.order },
      update: {},
      create: slide,
    });
    console.log(`  ✓ Slide ${slide.order}: ${slide.title}`);
  }

  console.log('\nAll done! Categories and slides are ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
