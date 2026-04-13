// prisma/seed-demo-stories.ts
// Seeds the database with real-feeling horror stories for a fresh installation.
// Run with: npx ts-node prisma/seed-demo-stories.ts
// Or add it to package.json scripts.

import 'dotenv/config';
import { PrismaClient, Role, StoryStatus, ContentRating } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';

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

const DEMO_PASSWORD = 'Horror123!';

// The demo author that will own all seeded stories
const demoAuthor = {
  username: 'SilentWitness',
  email:    'witness@silentevidence.com',
  bio:      'I write down the things I cannot explain. Some of them happened to me. Some were told to me by people I trust. All of them are real.',
};

// Categories used by the demo stories — must match slugs in seed.ts
const categories = [
  { slug: 'campfire-stories',      name: 'Campfire Stories',      description: 'The kind of story you tell in the dark.' },
  { slug: 'paranormal',            name: 'Paranormal',            description: 'Personal encounters with things that defy explanation.' },
  { slug: 'true-crime',            name: 'True Crime',            description: 'Real cases and the people who lived them.' },
  { slug: 'haunted-locations',     name: 'Haunted Locations',     description: 'Places where something refuses to leave.' },
  { slug: 'unexplained-disappearances', name: 'Unexplained Disappearances', description: 'People who vanished without a trace.' },
  { slug: 'witness-accounts',      name: 'Witness Accounts',      description: 'First-hand testimonies the author cannot explain.' },
  { slug: 'sleep-paralysis',       name: 'Sleep Paralysis',       description: 'Waking up frozen, seeing figures in the dark.' },
] as const;

const stories = [
  // ── 1. Campfire ──────────────────────────────────────────────────────────
  {
    title:        'The Man at the Edge of the Firelight',
    slug:         'the-man-at-the-edge-of-the-firelight',
    categorySlug: 'campfire-stories',
    featured:     true,
    contentRating: ContentRating.ALL,
    mood:         'DARK',
    excerpt:      'We were camping in the Ozarks when my uncle pointed past the fire and said, very quietly, do not look directly at him.',
    coverImage:   'https://picsum.photos/seed/campfire1/1200/700',
    content: `<p>My uncle Dale was not someone who scared easily.</p>

<p>He had spent twenty-two years doing search and rescue in the Ozarks. He had pulled bodies out of rivers and carried people down cliffs in the dark and once, he told me, he had sat with a man who died before the helicopter arrived, just so the man would not be alone. He did not believe in ghosts. He did not believe in much of anything he could not put his hands on.</p>

<p>So when he pointed past the fire and said, very quietly, <em>do not look directly at him</em>, I believed him immediately.</p>

<p>We were three nights into a backcountry trip, just the two of us, deep in a part of the Mark Twain National Forest that Dale knew well enough to navigate without a map. The fire was low. The night was the kind of quiet that feels occupied, not empty.</p>

<p>I did what he said. I kept my eyes on the coals and breathed slowly.</p>

<p>"He's been standing there since I came back from the creek," Dale said. His voice had the same flat tone he used when he was giving instructions during a rescue. Calm. Deliberate. No room for panic.</p>

<p>"Animal?" I asked.</p>

<p>"No."</p>

<p>We sat like that for what felt like a long time. I could feel something at the edge of my vision, in the space just beyond where the firelight died. Not a shape exactly. More like a weight. A place where the dark was slightly darker than it should have been.</p>

<p>"Is he moving?" I asked.</p>

<p>"No. That's the part that bothers me."</p>

<p>Eventually Dale added wood to the fire and turned up the lamp we had brought for emergencies. The light pushed out further. Whatever had been standing there was gone, if it had been standing there at all.</p>

<p>We packed up and hiked out before sunrise.</p>

<p>Dale never told me what he thought it was. When I asked him years later, he said he had seen a lot of things in those woods he could not explain. He said the rule he had made for himself was simple: if it does not approach you and you do not approach it, you leave each other alone.</p>

<p>"Has that always worked?" I asked.</p>

<p>He was quiet for a moment.</p>

<p>"So far," he said.</p>`,
  },

  // ── 2. Paranormal ────────────────────────────────────────────────────────
  {
    title:        'The Voicemail My Dead Mother Left Me',
    slug:         'the-voicemail-my-dead-mother-left-me',
    categorySlug: 'paranormal',
    featured:     true,
    contentRating: ContentRating.ALL,
    mood:         'MYSTERIOUS',
    excerpt:      'My mother had been dead for eleven months when I got the call. The number was hers. The voice was hers. The message made no sense — until three days later.',
    coverImage:   'https://picsum.photos/seed/paranormal1/1200/700',
    content: `<p>My mother died in February of last year. Ovarian cancer, diagnosed in October, gone by February. She was fifty-four.</p>

<p>I kept her number in my phone because deleting it felt wrong. I do not know what I expected. Maybe nothing. Maybe I just needed the contact to still be there, the way you keep a coat that belonged to someone even though they are never coming back for it.</p>

<p>Eleven months after she died, my phone buzzed at 2:17 in the morning.</p>

<p>It was her number.</p>

<p>I did not answer. My heart was going so fast I could feel it in my ears. I watched the screen until the call went to voicemail, then I sat in the dark for about ten minutes before I could make myself listen.</p>

<p>The recording was forty-three seconds long.</p>

<p>The first thing I heard was breathing. Not labored, not frightened. Slow. The way she breathed when she was resting in the last few weeks, when she was on the good pain medication and the world had gotten soft for her.</p>

<p>Then she said my name.</p>

<p>I have listened to that recording more times than I can count now and I am still not sure what she said after my name. The audio quality drops and the words blur together the way words do when someone is speaking from very far away or through something. But the last four seconds are clear.</p>

<p>She said: <em>"It's all right. The window faces east."</em></p>

<p>I did not know what that meant. I had no context for it. I wrote it down and I called her old number back and got a message saying it had been disconnected, which it should have been, because we had cancelled the plan the week after the funeral.</p>

<p>Three days later I was going through a box of her things I had not been able to open before. At the bottom, under some letters, was a card she had written to me and never sent. I do not know when she wrote it. The date was not on it.</p>

<p>It said: <em>If you are lost, remember — the window in your first apartment faced east. You always felt better in the mornings there. Find a window like that wherever you end up.</em></p>

<p>I have not heard from her again.</p>

<p>I moved in the spring. I made sure the bedroom window faces east.</p>`,
  },

  // ── 3. Haunted Location ───────────────────────────────────────────────────
  {
    title:        'The Hospital That Should Have Been Demolished in 1987',
    slug:         'the-hospital-that-should-have-been-demolished-in-1987',
    categorySlug: 'haunted-locations',
    featured:     false,
    contentRating: ContentRating.TEEN,
    mood:         'DARK',
    excerpt:      'We were hired to document a decommissioned psychiatric ward before demolition. The demolition was postponed. We do not know why. We left after what we found on the fourth floor.',
    coverImage:   'https://picsum.photos/seed/hospital1/1200/700',
    content: `<p>I do urban exploration as a hobby. I want to get that out of the way because some people hear that and immediately assume I am looking for trouble or a ghost story to post online. I am not. I am a photographer. I am interested in what buildings look like when they are left alone.</p>

<p>In the spring of two years ago, a colleague connected me with a demolition company that occasionally hires documentarians to photograph condemned structures before they come down. Legal access, professional context, no trespassing. I had done three of these jobs before.</p>

<p>The building was a former psychiatric hospital built in the early 1900s and closed in the late 1980s. It had been left largely intact since then, held in a legal dispute over the land. The demolition had been scheduled several times and postponed each time. I did not ask why.</p>

<p>The lower floors were what I expected. Collapsed drop ceilings, water damage, the particular gray light of rooms that have not been touched in decades. Institutional furniture. Old equipment. Paint peeling in long strips from walls the color of old teeth.</p>

<p>I was on the fourth floor when I found the room.</p>

<p>It was a patient room like the others except that the walls were covered floor to ceiling in handwriting. Not scratched. Written, in what looked like pencil and in some places something darker, in neat careful lines that covered every surface including the ceiling.</p>

<p>The same sentence, repeated thousands of times: <em>I am still here and you already left.</em></p>

<p>I photographed it. I did not stay long.</p>

<p>When I submitted the photos the project manager called me and asked me not to include the fourth floor room in the final deliverable. I asked why. She said the company had found the room on a previous visit and that including it in documentation created complications they did not want to deal with.</p>

<p>I asked what kind of complications.</p>

<p>She did not answer that question. She said the building's demolition had been postponed again and she would be in touch when they had a new date.</p>

<p>That was twenty-two months ago. I have not heard from her. The building is still standing.</p>`,
  },

  // ── 4. True Crime ──────────────────────────────────────────────────────────
  {
    title:        'My Neighbor Was on the FBI Most Wanted List',
    slug:         'my-neighbor-was-on-the-fbi-most-wanted-list',
    categorySlug: 'true-crime',
    featured:     true,
    contentRating: ContentRating.TEEN,
    mood:         'DRAMATIC',
    excerpt:      'He had lived across the street from us for six years. He fixed our fence after the storm. He brought soup when my father had surgery. The agents came on a Tuesday morning.',
    coverImage:   'https://picsum.photos/seed/truecrime1/1200/700',
    content: `<p>His name was Gary, or at least that is what he told us when he moved in. He was in his late fifties, a little heavyset, always wore a baseball cap for the local team. He had a golden retriever named Cooper who was allowed to run in our yard when we were not using it. My mother liked him. My father liked him. I liked him.</p>

<p>He shoveled our sidewalk in winter without being asked. When we left for vacation he collected our mail. When my father had his hip replaced and could not drive for six weeks, Gary was the one who picked up groceries twice a week and refused to take any money for it. He said it was what you did for neighbors and he meant it.</p>

<p>He had lived across the street from us for six years when the cars arrived.</p>

<p>Three unmarked vehicles parked at the same moment, one in the driveway and two at the curb. Eight agents in vests. It was 7:14 on a Tuesday morning and I was about to leave for school and I watched it happen from our front window because I did not understand what I was seeing fast enough to look away.</p>

<p>Gary came to the door when they knocked. He did not run. He put his hands up without being asked. Cooper barked once from inside and then was quiet.</p>

<p>I found out later what he had done. I am not going to write the details here because some of the victims have families who are still alive and the details belong to them, not to a story about how surprised I was. I will say that it was financial in nature, and that it spanned twelve years, and that there were forty-three people who lost everything because of him. Some of them were elderly. Some of them never recovered.</p>

<p>The thing I think about most is not what he did. It is that he did all of it while also being exactly the neighbor he appeared to be. The shoveling was real. The groceries were real. The soup was real.</p>

<p>I do not know what that means. I have been turning it over for years and I still do not know what it means about people, or about the way we decide to trust them.</p>`,
  },

  // ── 5. Sleep Paralysis ────────────────────────────────────────────────────
  {
    title:        'The Figure Who Stands in My Doorway',
    slug:         'the-figure-who-stands-in-my-doorway',
    categorySlug: 'sleep-paralysis',
    featured:     false,
    contentRating: ContentRating.ALL,
    mood:         'DARK',
    excerpt:      'The first time I was sixteen. I woke up and could not move and something was standing in the doorway watching me. The doctors say it is sleep paralysis. The doctors have never seen what I see.',
    coverImage:   'https://picsum.photos/seed/sleeppar1/1200/700',
    content: `<p>The first time it happened I was sixteen years old.</p>

<p>I woke up in the dark and I could not move. I knew immediately that I was awake. I was not dreaming — I could feel the sheet against my arms and the pillow under my head and the specific weight of not being able to lift a finger. If you have never had sleep paralysis then the closest I can get you to understanding it is this: imagine waking up and realizing your body has forgotten you are still inside it.</p>

<p>There was something in the doorway.</p>

<p>It was tall. I say tall but I am not certain because the doorway is seven feet and whatever was standing there reached the top of it. It was dark — not wearing dark clothes, but <em>made</em> of dark, the way a shadow is made of dark. It had a shape that suggested a person the way a coat hanging on a hook suggests a person. If you looked directly at it your eyes tried to tell you there was nothing there. If you looked slightly away you could see it clearly.</p>

<p>It stood there for what I estimate was three to four minutes. I could not tell if it was watching me. I could not tell if it was aware of me at all. Then I could move again and the doorway was just a doorway.</p>

<p>I have had the experience forty-one times since then. I know the count because I started writing them down after the fifth time, when I realized it was not going to stop.</p>

<p>The figure is always in the doorway. It is always the same height. It never comes closer. It never speaks. It is always gone the moment I can move.</p>

<p>I have been to three different doctors. They have all told me the same thing: sleep paralysis is extremely common, the hallucinations are a well-documented feature of the hypnagogic state, and the best treatment is improving sleep hygiene and reducing stress.</p>

<p>I sleep well. I am not especially stressed. And whatever is standing in my doorway has been doing it for fourteen years.</p>

<p>I have started sleeping with the door closed. The figure does not appear when the door is closed.</p>

<p>I do not know why.</p>

<p>I do not think I want to find out.</p>`,
  },

  // ── 6. Unexplained Disappearance ──────────────────────────────────────────
  {
    title:        'My Sister Disappeared on a Clear Day With No Reason',
    slug:         'my-sister-disappeared-on-a-clear-day-with-no-reason',
    categorySlug: 'unexplained-disappearances',
    featured:     false,
    contentRating: ContentRating.ALL,
    mood:         'MYSTERIOUS',
    excerpt:      'She was walking from the bus stop to our house, a route she had walked four hundred times. It is a nine-minute walk. She never arrived. That was eight years ago.',
    coverImage:   'https://picsum.photos/seed/disappear1/1200/700',
    content: `<p>My sister Della was twenty-three years old when she disappeared.</p>

<p>She was coming home from a shift at the hospital where she worked as a nursing assistant. She took the 6:40 bus, which she had taken hundreds of times. The bus stop was four-tenths of a mile from our parents' house, a route she had walked since she was in middle school. A straight road, mostly residential, with streetlights on every block.</p>

<p>The bus driver remembers her getting off. The timestamp on the surveillance camera at the gas station on the corner of Millbrook and Hayden shows her passing at 6:52 p.m. She is looking at her phone. She is wearing her navy blue scrubs and her white sneakers and the yellow jacket she bought the previous spring that our mother had told her was too bright. She looks tired in the way people look when they have just finished a long shift.</p>

<p>She does not appear on the camera outside our parents' house, which is motion-activated and was installed the year before specifically because my father had started to feel that the neighborhood was changing.</p>

<p>In those four-tenths of a mile, between 6:52 p.m. and whenever she would have arrived home, Della simply stopped being findable.</p>

<p>I am telling you things I have told many times before because telling them is the only thing I know how to do with them. There was an investigation. It was thorough. There were searches. They were extensive. Every person who might have had contact with her in the weeks before was interviewed. Every communication she had made was examined. Every financial transaction, every digital footprint, every camera on every route she might have taken.</p>

<p>Nothing.</p>

<p>Not a signal from her phone after 6:54 p.m. Not a sighting. Not a trace.</p>

<p>My parents still live in that house. My mother still sleeps with her phone on the loudest setting it goes. My father drove the route between the bus stop and the house every day for two years, sometimes twice a day, looking at the yards and the side streets and the spaces between things.</p>

<p>Della has been gone for eight years.</p>

<p>I write about it because I was told once by someone who works in missing persons that the families who keep talking are the reason some cases get solved, sometimes years later. Someone reads something and remembers something they had not thought to report. A detail connects to another detail.</p>

<p>Her name is Della Reyes. She is thirty-one now, or she would be. She was last seen on a clear evening in October on a road she had walked four hundred times.</p>

<p>If you have ever seen something and not known what to do with it, you can do something with it now.</p>`,
  },

  // ── 7. Witness Account ────────────────────────────────────────────────────
  {
    title:        'What We All Saw Over Lake Meridian in 1998',
    slug:         'what-we-all-saw-over-lake-meridian-in-1998',
    categorySlug: 'witness-accounts',
    featured:     false,
    contentRating: ContentRating.ALL,
    mood:         'MYSTERIOUS',
    excerpt:      'Eleven people on the lakeshore saw the same thing at the same time. We were children. We grew up. We never stopped talking about it — and none of us has ever been able to explain it.',
    coverImage:   'https://picsum.photos/seed/witness1/1200/700',
    content: `<p>There were eleven of us on the shore that evening.</p>

<p>It was the last week of August 1998, and we were at the Meridian summer camp for one final night before parents arrived to collect us in the morning. We were between the ages of ten and fourteen. I was twelve. We had been given free time after dinner and most of us had drifted to the dock to watch the sun go down over the lake.</p>

<p>The light appeared at 8:41 p.m. I know the time because one of the older boys had a digital watch and looked at it when the light appeared, and later wrote the time in the margin of a notebook he kept. He still has that notebook.</p>

<p>It was not a star. It was not a plane. We had all seen planes over the lake many times, and what we were seeing had none of the characteristics of a plane. It was stationary. It was too bright. It was low — lower than any aircraft we had seen — and it was directly over the center of the lake. The color was white but not the white of an electric light. It was closer to the white of something burning very cleanly at a very high temperature.</p>

<p>It stayed there for four minutes.</p>

<p>No one spoke. I do not say that for dramatic effect — we genuinely did not speak. The counselor who had been watching us from the picnic tables later told us that she had seen something too and had the same instinct not to make noise, though she was not able to explain why.</p>

<p>Then the light moved sideways, very fast, over the tree line to the north, and was gone.</p>

<p>We talked about it that night, in our cabins, and we talked about it in the cars going home and we have been talking about it in one form or another for twenty-six years. I have been in contact with seven of the other ten witnesses as adults. We all describe the same thing in the same way. We have compared our accounts many times. There is no meaningful variation.</p>

<p>I am not telling you it was a spacecraft or a government aircraft or anything else. I am telling you that eleven people saw the same thing at the same time and not one of us has found a satisfying explanation for it in more than two decades of looking.</p>

<p>If you were at Lake Meridian summer camp in August 1998, I would like to hear from you.</p>`,
  },
] as const;

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

async function ensureCategory(slug: string) {
  const category = categories.find((c) => c.slug === slug);
  if (!category) throw new Error(`Missing category config for slug: ${slug}`);

  return prisma.category.upsert({
    where:  { slug: category.slug },
    update: {},
    create: { name: category.name, slug: category.slug, description: category.description },
  });
}

async function ensureDemoAuthor() {
  // First try to find any existing author/admin to use
  const existing = await prisma.user.findFirst({
    where:   { role: { in: [Role.AUTHOR, Role.ADMIN] } },
    orderBy: { id: 'asc' },
    include: { profile: true },
  });
  if (existing) return existing;

  // No author found — create the demo account
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  return prisma.user.create({
    data: {
      username:   demoAuthor.username,
      email:      demoAuthor.email,
      password:   hashedPassword,
      role:       Role.AUTHOR,
      isVerified: true,
      profile: {
        create: {
          bio:    demoAuthor.bio,
          avatar: `https://api.dicebear.com/8.x/personas/svg?seed=${encodeURIComponent(demoAuthor.username)}&backgroundColor=dc2626`,
        },
      },
    },
    include: { profile: true },
  });
}

// ─────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log('Ensuring demo author and categories...');

  const author = await ensureDemoAuthor();
  console.log(`Using author: @${author.username}`);

  const categoryMap = new Map<string, number>();
  for (const cat of categories) {
    const row = await ensureCategory(cat.slug);
    categoryMap.set(cat.slug, row.id);
    console.log(`  category ready: ${row.name}`);
  }

  console.log(`\nSeeding ${stories.length} horror stories...`);

  for (const story of stories) {
    const categoryId = categoryMap.get(story.categorySlug);
    if (!categoryId) throw new Error(`Category not found: ${story.categorySlug}`);

    const row = await prisma.story.upsert({
      where:  { slug: story.slug },
      update: {
        title:         story.title,
        excerpt:       story.excerpt,
        content:       story.content,
        coverImage:    story.coverImage,
        status:        StoryStatus.PUBLISHED,
        featured:      story.featured,
        language:      'en',
        contentRating: story.contentRating,
        authorId:      author.id,
        categoryId,
      },
      create: {
        title:         story.title,
        slug:          story.slug,
        excerpt:       story.excerpt,
        content:       story.content,
        coverImage:    story.coverImage,
        status:        StoryStatus.PUBLISHED,
        featured:      story.featured,
        language:      'en',
        contentRating: story.contentRating,
        authorId:      author.id,
        categoryId,
      },
    });

    console.log(`  ✓ "${row.title}"`);
  }

  console.log('\nAll horror stories seeded successfully.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
