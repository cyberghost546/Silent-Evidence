import 'dotenv/config';
import { PrismaClient, Role, StoryStatus, ContentRating } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';

function parseDbUrl() {
  const url = new URL(process.env.DATABASE_URL!);
  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  };
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(parseDbUrl()),
});

const DEMO_PASSWORD = 'Horror123!';

const demoAuthor = {
  username: 'DemoSensei',
  email: 'demosensei@silentevidence.com',
  bio: 'Resident demo author for horror-flavored stories, seasonal features, and test content.',
};

const categories = [
  {
    slug: 'shonen',
    name: 'Shonen',
    description: 'Action-packed stories of friendship, rivalry, and growth.',
  },
  {
    slug: 'slice-of-life',
    name: 'Slice of Life',
    description: 'Everyday moments that capture the beauty of ordinary life.',
  },
  {
    slug: 'mecha',
    name: 'Mecha',
    description: 'Giant robots, epic battles, and the pilots who drive them.',
  },
  {
    slug: 'fantasy',
    name: 'Fantasy',
    description: 'Magic systems, mythical creatures, and enchanted worlds.',
  },
  {
    slug: 'psychological',
    name: 'Psychological',
    description: 'Mind-bending stories that challenge perception and reality.',
  },
] as const;

const stories = [
  {
    title: 'Skyforge Rebellion',
    slug: 'skyforge-rebellion',
    categorySlug: 'shonen',
    excerpt:
      'A hot-headed courier discovers his city runs on a sealed dragon core and decides the empire should not be the only one controlling its fire.',
    content: `Rin had crossed the upper rails of Skyforge a thousand times, but the city had never sounded this loud.

Steam engines thundered under the bridges, messenger drones screamed overhead, and the imperial alarm bells rolled across the towers like a challenge.

He should have delivered the package and disappeared.

Instead, he opened it.

Inside was a black key carved with the same scale pattern etched into the furnaces beneath the capital. The moment he touched it, the old heat under the streets changed. He felt it in his bones, like the city itself had inhaled.

"That key belongs to the core," the mechanic beside him whispered. "If the empire lost it, this whole district just became a battlefield."

Rin looked down at the workers below, the smoke-stained children on the catwalks, and the soldiers locking down exits for a secret they were never meant to know.

He did the most reckless thing possible.

He ran toward the furnace gates instead of away from them.

By sunset, half the district believed he was a thief, the other half thought he was a hero, and every captain in the city wanted his face on a wanted poster.

For the first time in his life, Rin felt like he was exactly where he needed to be.`,
    coverImage: 'https://picsum.photos/seed/skyforge-rebellion/1200/700',
    featured: true,
  },
  {
    title: 'Convenience Store at the Edge of Summer',
    slug: 'convenience-store-at-the-edge-of-summer',
    categorySlug: 'slice-of-life',
    excerpt:
      'A quiet high-schooler takes a summer shift at a 24-hour store and slowly becomes part of the strange little night community around it.',
    content: `The store looked ordinary in daylight.

At 1:13 a.m., it felt like a tiny country with its own rules.

Mika learned that on her third night shift, somewhere between restocking tea bottles and watching moths bounce against the fluorescent sign outside. A taxi driver came in for curry bread at the same time every night. An old woman bought exactly one peach yogurt and never used the basket she carried. A boy in a basketball uniform always forgot his wallet and came back breathless ten minutes later.

None of it was dramatic. That was the point.

The store was where people landed after the louder part of the day was over.

When the rain started, customers lingered by the windows and talked longer than usual. The manager made coffee he was technically not supposed to make for staff. Someone left a folded umbrella by the manga rack with a note that only said, "For the next person."

Mika took it home at the end of her shift and stood under it at dawn while cicadas started up in the power lines.

It was the first summer in years that did not feel like something she had to survive.

It felt like something she could step into, one small night at a time.`,
    coverImage: 'https://picsum.photos/seed/convenience-store-summer/1200/700',
    featured: false,
  },
  {
    title: 'Last Orbit Frame',
    slug: 'last-orbit-frame',
    categorySlug: 'mecha',
    excerpt:
      'The final combat frame left in Earth orbit chooses a pilot who has never won a fight, only outlasted them.',
    content: `The machine had been sleeping above the planet for nineteen years.

Every military archive said it was dead metal.

Every pilot who had tried to sync with it had blacked out before the start-up sequence finished.

Aya only climbed into the cockpit because nobody else was left.

The station hull rattled with incoming fire. Emergency lights pulsed red against cracked display glass. Somewhere below her, the evacuation lift jammed between decks with civilians still inside.

"You are not cleared for this unit," the control officer shouted over comms.

"Then clear me after I save you," Aya answered.

The frame woke up before anyone could stop her.

Cold light spread through the cockpit rings, then down her arms, then into the scar tissue along her spine where an old training accident had ended her career before it ever really started. Outside the canopy, the ruined dockyard reflected in the machine's armor like a shattered constellation.

The enemies approaching Earth had numbers, range, and better pilots.

Aya had one impossible machine and exactly one reason not to retreat.

For the first time since the war had started, orbit belonged to someone who had nothing left to prove and everything left to protect.`,
    coverImage: 'https://picsum.photos/seed/last-orbit-frame/1200/700',
    featured: true,
  },
  {
    title: 'The Archivist of Glass Forest',
    slug: 'the-archivist-of-glass-forest',
    categorySlug: 'fantasy',
    excerpt:
      'In a forest where memories crystallize on branches, a young archivist must decide which stories deserve to be preserved and which should be allowed to disappear.',
    content: `The trees never grew leaves.

They grew memories.

At sunrise, the branches of the Glass Forest shimmered with translucent shards, each one holding a moment someone in the kingdom had forgotten, buried, or surrendered willingly to the woods. Joy looked like pale gold. Regret turned smoky blue. Some memories were so heavy the branches bent toward the moss.

Elian's job was to catalog them before storms broke them loose.

It was delicate work. Dangerous too. Touch the wrong shard for too long and you could begin remembering a life that had never been yours. The senior archivists wore gloves lined with silver thread. Elian preferred bare hands. He said stories should feel like stories.

That was before he found the crimson shard.

It was hidden deep in the oldest part of the forest, suspended in a dead tree no map acknowledged. Inside it, a queen knelt beside a burned throne and said a name the kingdom had erased from every official record.

Elian recognized the name anyway.

It was his own.

By nightfall, the forest guards were hunting whoever had entered the restricted grove. By dawn, Elian knew the kingdom had not merely forgotten its history. It had curated it.

The forest had been preserving the version nobody was meant to see.`,
    coverImage: 'https://picsum.photos/seed/glass-forest/1200/700',
    featured: false,
  },
  {
    title: 'Afterimage Classroom',
    slug: 'afterimage-classroom',
    categorySlug: 'psychological',
    excerpt:
      'A model student starts noticing tiny delays in reality at school and realizes the class ranking system may be rewriting more than report cards.',
    content: `The first delay lasted less than a second.

Haru answered a question in history class, sat down, and then watched himself answer it again in the window reflection.

Nobody reacted.

He told himself it was exhaustion. Entrance exam season had pushed everyone past normal limits. The school halls smelled like printer ink, vending machine coffee, and nerves.

Then the delays spread.

Chalk hitting the board after the teacher had already stepped away. Laughter arriving too late. His own footsteps following half a beat behind him on empty stairwells.

At Kosei Academy, everything revolved around ranking. Test scores projected in the lobby. Weekly seating charts sorted by performance. Merit cards that opened better study rooms, better meal plans, better futures.

Haru had always ranked near the top, close enough to feel safe.

Then one Monday morning, he checked the board and found his name in first place.

He had not taken the exam.

Worse, everyone around him remembered watching him finish it.

When he asked his best friend what happened last Friday, she smiled politely and said, "You looked relieved when they corrected you."

Corrected.

That was the word that broke something open.

By the time the final bell rang, Haru was no longer sure whether the school was producing excellent students or editing them into existence.`,
    coverImage: 'https://picsum.photos/seed/afterimage-classroom/1200/700',
    featured: true,
  },
] as const;

async function ensureCategory(slug: string) {
  const category = categories.find((entry) => entry.slug === slug);
  if (!category) throw new Error(`Missing category config for slug: ${slug}`);

  return prisma.category.upsert({
    where: { slug: category.slug },
    update: {},
    create: {
      name: category.name,
      slug: category.slug,
      description: category.description,
    },
  });
}

async function ensureDemoAuthor() {
  const existingAuthor = await prisma.user.findFirst({
    where: { role: { in: [Role.AUTHOR, Role.ADMIN] } },
    orderBy: { id: 'asc' },
    include: { profile: true },
  });

  if (existingAuthor) return existingAuthor;

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  return prisma.user.create({
    data: {
      username: demoAuthor.username,
      email: demoAuthor.email,
      password: hashedPassword,
      role: Role.AUTHOR,
      isVerified: true,
      profile: {
        create: {
          bio: demoAuthor.bio,
          avatar: `https://api.dicebear.com/8.x/personas/svg?seed=${encodeURIComponent(demoAuthor.username)}&backgroundColor=22c55e`,
        },
      },
    },
    include: { profile: true },
  });
}

async function main() {
  console.log('Ensuring demo author and categories...');

  const author = await ensureDemoAuthor();

  const categoryMap = new Map<string, number>();
  for (const category of categories) {
    const row = await ensureCategory(category.slug);
    categoryMap.set(category.slug, row.id);
    console.log(`  category ready: ${row.name}`);
  }

  console.log(`Using author @${author.username}`);
  console.log(`Seeding ${stories.length} demo stories...`);

  for (const story of stories) {
    const categoryId = categoryMap.get(story.categorySlug);
    if (!categoryId) throw new Error(`Category not found for ${story.categorySlug}`);

    const row = await prisma.story.upsert({
      where: { slug: story.slug },
      update: {
        title: story.title,
        excerpt: story.excerpt,
        content: story.content,
        coverImage: story.coverImage,
        status: StoryStatus.PUBLISHED,
        featured: story.featured,
        language: 'en',
        contentRating: ContentRating.ALL,
        authorId: author.id,
        categoryId,
      },
      create: {
        title: story.title,
        slug: story.slug,
        excerpt: story.excerpt,
        content: story.content,
        coverImage: story.coverImage,
        status: StoryStatus.PUBLISHED,
        featured: story.featured,
        language: 'en',
        contentRating: ContentRating.ALL,
        authorId: author.id,
        categoryId,
      },
    });

    console.log(`  seeded: ${row.title}`);
  }

  console.log('\nDemo stories are ready.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
