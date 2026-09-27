// prisma/seed-categories.ts
// Adds the extended horror sub-genre categories to the database so they appear
// in the homepage "Browse by Category" grid (CategoriesShowcase reads straight
// from the Category table).
//
// Run it with: npm run db:seed:categories
//
// The script is additive and idempotent — it only creates rows whose slug/name
// don't exist yet, so existing categories (and their stories) are never touched.
//
// The slugs here match the ones CategoryDropdown generates
// (name.toLowerCase().replace(/ /g, '-')) and the icon keys in
// lib/categoryIcons.ts, so every new tile renders with its own icon.

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

const categories = [
  // ── Psychological and Mind Horror ────────────────────────────
  {
    name: 'Amnesia Horror',
    slug: 'amnesia-horror',
    description: 'Missing years, missing names — and the terror of what filled the gap.',
  },
  {
    name: 'Identity Horror',
    slug: 'identity-horror',
    description: 'Faces that are not yours, lives that were never really lived.',
  },
  {
    name: 'Madness',
    slug: 'madness',
    description: 'The slow collapse of a mind that can no longer trust itself.',
  },
  {
    name: 'Memory Horror',
    slug: 'memory-horror',
    description: 'Recollections that rewrite themselves — and remember you back.',
  },
  {
    name: 'Paranoia',
    slug: 'paranoia',
    description: 'Someone is watching. The worst part is being right.',
  },
  {
    name: 'Reality Distortion',
    slug: 'reality-distortion',
    description: 'Rooms that rearrange, rules that break, a world coming unstitched.',
  },
  {
    name: 'Unreliable Narrator',
    slug: 'unreliable-narrator',
    description: 'Every word is a confession. None of them are true.',
  },

  // ── Supernatural Horror ──────────────────────────────────────
  {
    name: 'Cursed Objects',
    slug: 'cursed-objects',
    description: 'Heirlooms, trinkets and gifts that take far more than they give.',
  },
  {
    name: 'Demonic Horror',
    slug: 'demonic-horror',
    description: 'Old names, older hungers, and the things that answer when called.',
  },
  {
    name: 'Exorcism',
    slug: 'exorcism',
    description: 'Rites performed against something that refuses to leave.',
  },
  {
    name: 'Haunted Dolls',
    slug: 'haunted-dolls',
    description: 'Painted eyes that follow you, and porcelain that moves at night.',
  },
  {
    name: 'Haunted Houses',
    slug: 'haunted-houses',
    description: 'Homes with memories of their own — and a reluctance to let go.',
  },
  {
    name: 'Poltergeists',
    slug: 'poltergeists',
    description: 'Slamming doors, thrown objects, and rage without a body.',
  },
  {
    name: 'Revenge Spirits',
    slug: 'revenge-spirits',
    description: 'The dead who came back with a list and all the time in the world.',
  },
  {
    name: 'Witch Horror',
    slug: 'witch-horror',
    description: 'Covens, hexes and bargains struck far from any road.',
  },

  // ── Creature Horror ──────────────────────────────────────────
  {
    name: 'Alien Horror',
    slug: 'alien-horror',
    description: 'Visitors whose intentions were never meant to be understood.',
  },
  {
    name: 'Cryptids',
    slug: 'cryptids',
    description: 'Things glimpsed at the tree line that no field guide will name.',
  },
  {
    name: 'Giant Monsters',
    slug: 'giant-monsters',
    description: 'Enormity given legs — and a reason to come inland.',
  },
  {
    name: 'Insect Horror',
    slug: 'insect-horror',
    description: 'Swarms, nests and things laid under the skin.',
  },
  {
    name: 'Killer Animals',
    slug: 'killer-animals',
    description: 'When the natural world stops running and starts hunting.',
  },
  {
    name: 'Mutant Creatures',
    slug: 'mutant-creatures',
    description: 'Biology gone wrong, and wrong in ways that keep growing.',
  },
  {
    name: 'Sea Monsters',
    slug: 'sea-monsters',
    description: 'Deep water, dark shapes, and the things beneath the hull.',
  },
  {
    name: 'Vampire Horror',
    slug: 'vampire-horror',
    description: 'Immortal appetites and the long patience of the undead.',
  },
  {
    name: 'Werewolf Horror',
    slug: 'werewolf-horror',
    description: 'The change that comes with the moon and never asks permission.',
  },
  {
    name: 'Zombie Horror',
    slug: 'zombie-horror',
    description: 'The dead walking, the living running, the world running out.',
  },

  // ── Dark and Violent Horror ──────────────────────────────────
  {
    name: 'Cannibal Horror',
    slug: 'cannibal-horror',
    description: 'Hospitality with a price you only learn at the table.',
  },
  {
    name: 'Killer Horror',
    slug: 'killer-horror',
    description: 'Methodical, patient, and already inside the house.',
  },
  {
    name: 'Backwoods Horror',
    slug: 'backwoods-horror',
    description: 'Wrong turns, unmarked roads, and locals who were expecting you.',
  },
  {
    name: 'Survival Games',
    slug: 'survival-games',
    description: 'Rules imposed by someone unseen, and no way to stop playing.',
  },

  // ── Sci-Fi Horror ────────────────────────────────────────────
  {
    name: 'Biohorror',
    slug: 'biohorror',
    description: 'Living tissue turned into a laboratory, a weapon, or a warning.',
  },
  {
    name: 'Genetic Experiments',
    slug: 'genetic-experiments',
    description: 'Code rewritten in flesh by people who never asked if they should.',
  },
  {
    name: 'Space Horror',
    slug: 'space-horror',
    description: 'Sealed hulls, endless dark, and something aboard with you.',
  },
  {
    name: 'Virtual Reality Horror',
    slug: 'virtual-reality-horror',
    description: 'Worlds you can log into — and eventually cannot log out of.',
  },

  // ── Mystery and Strange Horror ───────────────────────────────
  {
    name: 'Cursed Media',
    slug: 'cursed-media',
    description: 'Films, tapes and songs that change whoever finishes them.',
  },
  {
    name: 'Missing Persons',
    slug: 'missing-persons',
    description: 'People who stepped out of frame and never stepped back in.',
  },
  {
    name: 'Secret Experiments',
    slug: 'secret-experiments',
    description: 'Programmes buried in redacted files and unmarked buildings.',
  },
  {
    name: 'Unexplained Phenomena',
    slug: 'unexplained-phenomena',
    description: 'Events with witnesses, evidence, and no explanation at all.',
  },
  {
    name: 'Urban Exploration',
    slug: 'urban-exploration',
    description: 'Abandoned places entered by torchlight — and what still lives there.',
  },
  {
    name: 'Conspiracy Horror',
    slug: 'conspiracy-horror',
    description: 'Patterns that hold together far too well to be coincidence.',
  },
  {
    name: 'Forbidden Knowledge',
    slug: 'forbidden-knowledge',
    description: 'Truths that cannot be unlearned once the page is turned.',
  },

  // ── Historical and Cultural Horror ───────────────────────────
  {
    name: 'Japanese Horror',
    slug: 'japanese-horror',
    description: 'Quiet dread, vengeful spirits, and terror built on restraint.',
  },
  {
    name: 'Korean Horror',
    slug: 'korean-horror',
    description: 'Grief, guilt and hauntings rooted in family and history.',
  },
  {
    name: 'Victorian Horror',
    slug: 'victorian-horror',
    description: 'Gaslight, laudanum and respectable houses with locked rooms.',
  },
  {
    name: 'Medieval Horror',
    slug: 'medieval-horror',
    description: 'Plague, superstition and the dark between castle walls.',
  },
  {
    name: 'Mythological Horror',
    slug: 'mythological-horror',
    description: 'Old gods and older monsters, still owed what they were promised.',
  },
  {
    name: 'Ancient Evil',
    slug: 'ancient-evil',
    description: 'Something sealed away long ago, and recently disturbed.',
  },

  // ── Internet and Modern Horror ───────────────────────────────
  {
    name: 'ARG Horror',
    slug: 'arg-horror',
    description: 'Puzzles that bleed off the screen and into your actual life.',
  },
  {
    name: 'Dark Web Horror',
    slug: 'dark-web-horror',
    description: 'Hidden services, wrong links, and doors that open both ways.',
  },
  {
    name: 'AI Generated Horror',
    slug: 'ai-generated-horror',
    description: 'Machines dreaming — and the dreams starting to answer back.',
  },
  {
    name: 'Social Media Horror',
    slug: 'social-media-horror',
    description: 'Feeds, followers and accounts that keep posting after the end.',
  },
  {
    name: 'Surveillance Horror',
    slug: 'surveillance-horror',
    description: 'Cameras that never blink and footage no one admits to reviewing.',
  },
  {
    name: 'Digital Hauntings',
    slug: 'digital-hauntings',
    description: 'Ghosts that gave up on houses and moved into the hardware.',
  },
];

async function main() {
  console.log(`Seeding ${categories.length} extended categories...\n`);

  let created = 0;
  let skipped = 0;

  for (const category of categories) {
    // Match on slug OR name so we never trip the unique-name constraint and
    // never overwrite a category an admin already created by hand.
    const existing = await prisma.category.findFirst({
      where: { OR: [{ slug: category.slug }, { name: category.name }] },
    });

    if (existing) {
      console.log(`  · Already exists: ${category.name} — skipping`);
      skipped++;
      continue;
    }

    await prisma.category.create({ data: category });
    console.log(`  ✓ ${category.name}`);
    created++;
  }

  const total = await prisma.category.count();
  console.log(`\n${created} created, ${skipped} skipped. ${total} categories total.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
