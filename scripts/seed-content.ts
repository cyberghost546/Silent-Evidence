// scripts/seed-content.ts
// Run with: npx ts-node --project tsconfig.json scripts/seed-content.ts
// Creates demo slides and horror stories in the local database.

import { PrismaClient, Mood } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as dotenv from 'dotenv';
dotenv.config();

function parseDbUrl() {
  const url = new URL(process.env.DATABASE_URL!);
  return { host: url.hostname, port: parseInt(url.port) || 3306, user: url.username, password: url.password, database: url.pathname.slice(1) };
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(parseDbUrl()) });

async function main() {
  // ── 1. Ensure categories exist ─────────────────────────────────────────────
  const categoryData = [
    { name: 'Supernatural', slug: 'supernatural' },
    { name: 'Psychological', slug: 'psychological' },
    { name: 'Paranormal', slug: 'paranormal' },
    { name: 'Cosmic Horror', slug: 'cosmic-horror' },
    { name: 'Gothic', slug: 'gothic' },
  ];

  const categories: Record<string, number> = {};
  for (const cat of categoryData) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { name: cat.name, slug: cat.slug },
    });
    categories[cat.slug] = c.id;
    console.log(`Category: ${cat.name} (id=${c.id})`);
  }

  // ── 2. Ensure an admin/author user exists ──────────────────────────────────
  let author = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!author) {
    author = await prisma.user.findFirst();
  }
  if (!author) {
    console.error('No users found in the database. Create an account first, then re-run this script.');
    process.exit(1);
  }
  console.log(`Using author: ${author.username} (id=${author.id})`);

  // ── 3. Create horror stories ───────────────────────────────────────────────
  const stories = [
    {
      title: 'The Last Light on Hollow Street',
      slug: 'the-last-light-on-hollow-street',
      categorySlug: 'supernatural',
      mood: Mood.ATMOSPHERIC,
      excerpt: 'Every night at midnight, a single light flickers on in the abandoned house at the end of Hollow Street. No one has lived there in thirty years.',
      content: `<p>Every night at midnight, a single light flickered on in the abandoned house at the end of Hollow Street.</p>

<p>Nobody knew how. The electricity had been shut off in 1994. The property taxes hadn't been paid since before the Millburn family disappeared—all four of them, without a single trace, on a Tuesday evening in October.</p>

<p>Daniel watched it from his bedroom window every night. He had moved to Hollow Street six months ago, taking the only rental he could afford after the divorce. He told himself the light was a reflection. A neighbor's headlights. A trick of the fog that crawled in off the river most nights around eleven.</p>

<p>He told himself this right up until the night the light winked at him.</p>

<p>Three slow pulses. A pause. Then one long, steady glow that held for exactly eleven seconds before going dark.</p>

<p>Daniel counted. He couldn't help it. He counted, and when it ended, he realized his hands were pressed flat against the cold glass, and he couldn't remember standing up from his chair.</p>

<p>The next morning he asked Mrs. Petrov across the street about it. She was eighty-two, had lived on Hollow Street her whole life, and she looked at him the way old people sometimes look at the young—with a kind of tired sorrow, like they know something terrible is about to happen and there's nothing they can do to stop it.</p>

<p>"Don't count the pulses," she said. "That's the first rule."</p>

<p>Daniel opened his mouth to ask what the second rule was.</p>

<p>Mrs. Petrov had already closed her door.</p>

<p>That night Daniel sat in his chair deliberately facing away from the window. He put on music. He made dinner. He did everything a normal person does on a normal evening.</p>

<p>At midnight, the music cut out.</p>

<p>The power in his house didn't flicker. The clock on the microwave still glowed green. Only the speakers went silent, mid-song, as though something in the air had swallowed the sound.</p>

<p>In the silence, he heard the counting.</p>

<p>Not in his mind. Not from outside. From behind him, in the room—a soft, dry sound like a finger tapping against wood. One. Two. Three. A pause. Then a long, sustained tap that went on and on.</p>

<p>Daniel turned around.</p>

<p>The window was dark. The house at the end of Hollow Street showed nothing but black glass.</p>

<p>But his reflection in the window—his reflection was counting on its fingers.</p>

<p>And it was smiling.</p>

<p>He never learned the second rule.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=800&q=80',
      featured: true,
    },
    {
      title: 'What the Mirror Remembers',
      slug: 'what-the-mirror-remembers',
      categorySlug: 'psychological',
      mood: Mood.DISTURBING,
      excerpt: 'After her husband\'s death, Clara notices the old mirror in the hallway shows her rooms the way they used to look—before she changed everything.',
      content: `<p>Clara noticed it first on a Wednesday, three weeks after the funeral.</p>

<p>She was walking past the hallway mirror—the old oval one with the tarnished silver frame that Edward had found at an estate sale and insisted on keeping even though she'd always found it unsettling—when she stopped.</p>

<p>The chair. In the reflection, the small red chair she'd donated to the church two days after Edward died was back in the corner of the living room.</p>

<p>She turned around. The corner was empty.</p>

<p>She turned back. In the mirror, the chair sat exactly where Edward used to put it, angled just so toward the window.</p>

<p>Clara pressed her fingers to the glass. Cold. Perfectly ordinary glass. The chair in the reflection didn't move, didn't flicker, didn't vanish. It simply sat there, patient and solid, in a room that no longer contained it.</p>

<p>She pulled the mirror off the wall and carried it to the garage.</p>

<p>The next morning she walked past the garage and heard, faintly, the sound of Edward's record player. The one she'd boxed up. The one she'd sealed with tape.</p>

<p>The record player was inside the mirror.</p>

<p>She could see it in the reflection of the garage wall—sitting on a shelf that no longer existed, playing a record she couldn't name, the needle tracing its slow circle.</p>

<p>That was when Clara understood that the mirror wasn't haunted.</p>

<p>It was grieving.</p>

<p>It was holding onto everything she was trying to let go of, because no one had told it that Edward was gone. Because mirrors don't read obituaries. Because mirrors only know what they've seen, and what the mirror had seen, for seventeen years, was a life—a whole, complete, unbearably ordinary life—and it was not ready to forget.</p>

<p>Clara sat down on the cold garage floor in front of the mirror.</p>

<p>In the reflection, Edward sat down across from her, in his chair, with his coffee, reading his newspaper from a date she couldn't quite make out.</p>

<p>She stayed there until dark.</p>

<p>She never sold the mirror.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=800&q=80',
      featured: true,
    },
    {
      title: 'The Cartographer of Dead Places',
      slug: 'the-cartographer-of-dead-places',
      categorySlug: 'cosmic-horror',
      mood: Mood.ATMOSPHERIC,
      excerpt: 'He made maps of places that no longer existed. Then one of his maps showed a place that hadn\'t been destroyed yet.',
      content: `<p>Elias made maps of places that no longer existed.</p>

<p>Ghost towns. Submerged villages. Cities erased by fire or flood or the slow indifference of time. He called himself a cartographer of dead places, and he was very good at his work. His maps hung in three university libraries and one museum that had paid an embarrassing amount of money for a rendering of a Romanian village swallowed by a reservoir in 1966.</p>

<p>He worked from historical records, old photographs, survivor accounts. He was meticulous. He was accurate. He had never once mapped something that hadn't happened.</p>

<p>Until the map of Crestfield.</p>

<p>He found the name in a regional archive—a logging settlement, population four hundred, somewhere in the northern forest. The records were thin. A founding document from 1887. A church registry with thirty-seven names. A single photograph, blurry and dark, of a main street that looked like every other main street from that era.</p>

<p>Elias mapped it the way he mapped everything: carefully, methodically, filling in the gaps with architectural probability and period research. He mapped the church, the mill, the seven streets, the houses with their peaked roofs and their covered porches.</p>

<p>When he finished, he dated the map 1891 and pinned it to his wall.</p>

<p>Three months later, a journalist friend sent him a link to a news article. A logging settlement in the northern forest had been abandoned under mysterious circumstances. All four hundred residents had left their homes, their belongings, their vehicles. They had simply walked into the trees.</p>

<p>The settlement's name was Crestfield.</p>

<p>The photographs accompanying the article showed a main street. A church. A mill. Seven streets with peaked-roof houses and covered porches.</p>

<p>His map was dated 1891. The article was dated this year.</p>

<p>Elias went to his filing cabinet and pulled out the records he'd used to build the map. The founding document. The church registry. The photograph.</p>

<p>They were all dated this year too.</p>

<p>He didn't understand how he hadn't noticed that before. He didn't understand how documents from this year had ended up in an archive of nineteenth-century records. He didn't understand any of it.</p>

<p>What he understood was that somewhere, in a filing system he hadn't yet located, there was a folder with his name on it.</p>

<p>And someone, or something, had already begun to map the place where he lived.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=800&q=80',
      featured: false,
    },
    {
      title: 'Thirty-Three Steps',
      slug: 'thirty-three-steps',
      categorySlug: 'paranormal',
      mood: Mood.ATMOSPHERIC,
      excerpt: 'The staircase in the old hotel has thirty-three steps. Everyone who counts them agrees. Except the people who make it to the top.',
      content: `<p>The Ashford Hotel had three floors, a grand staircase, and thirty-three steps.</p>

<p>Everyone agreed on this. The building inspector who'd certified the hotel in 1923 had counted thirty-three. The renovation team in 1987 had counted thirty-three. The paranormal enthusiasts who visited every October counted thirty-three, and argued about it on their forums, and came back the next year and counted thirty-three again.</p>

<p>The disagreement was only among those who made it to the top.</p>

<p>Margaret had been the night manager for eleven years. In eleven years she had climbed those stairs more times than she could count. She knew every creak, every imperfection in the carpet, every spot where the banister wobbled slightly despite three different attempts to fix it.</p>

<p>She had never, in eleven years, arrived at the top landing having counted thirty-three.</p>

<p>Thirty-four, always. She'd assumed for years that she was miscounting, losing track somewhere in the middle. She'd tried counting out loud. She'd tried marking her steps with a clicker borrowed from the front desk. She always reached the top at thirty-four.</p>

<p>The new porter, a college student named Dev, came to her on his third night.</p>

<p>"I think there's something wrong with the stairs," he said. He looked embarrassed about it.</p>

<p>"The count," Margaret said.</p>

<p>He nodded, relieved she understood. "I keep getting thirty-four."</p>

<p>"What does the extra step feel like?"</p>

<p>He thought about it. "It feels like—" He stopped. "It feels like stepping onto a floor that isn't quite there. Like the floor gives a little. Like it's not as solid."</p>

<p>Margaret nodded slowly. "The thirty-fourth step has been there the whole time. The hotel was built around it."</p>

<p>"What do you mean?"</p>

<p>"I mean," she said carefully, "that some people can feel it and some people can't. The people who feel it tend to—" She stopped.</p>

<p>"Tend to what?"</p>

<p>Margaret had worked at the Ashford for eleven years. In eleven years she had watched nine people who counted thirty-four steps quit their jobs within a week. Seven guests who mentioned it during checkout never came back. Two guests who mentioned it during check-in never came back either, though not because they left.</p>

<p>"Tend to notice other things," she finished. "Go home, Dev. Don't come back."</p>

<p>He came back the next night.</p>

<p>In the morning, his count was thirty-five.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1548268770-66184a21657e?w=800&q=80',
      featured: false,
    },
    {
      title: 'The Tenant in Room 4',
      slug: 'the-tenant-in-room-4',
      categorySlug: 'gothic',
      mood: Mood.DARK,
      excerpt: 'The landlady said Room 4 had been empty for years. The smell coming from under the door suggested otherwise.',
      content: `<p>The landlady said Room 4 had been empty for two years.</p>

<p>She said this quickly, with her eyes on the key rack instead of on Nora, and Nora was a journalist and noticed things like that. She also noticed the smell that came from under the door of Room 4 when she walked past it: damp wood and something sweet and slightly wrong, like fruit left too long in a warm room.</p>

<p>She took Room 7. It was cheaper than she'd expected.</p>

<p>The boarding house was tall and narrow and Victorian and probably beautiful once. Now it was the kind of beautiful that had curdled—ornate plasterwork gone gray, wood floors warped by decades of winter damp, stained glass in the parlor windows casting colors that were not quite right.</p>

<p>Nora heard it on her first night. A sound from Room 4, directly below her: the slow, deliberate creak of a rocking chair.</p>

<p>Back and forth. Back and forth. For exactly forty minutes, then silence.</p>

<p>She asked the landlady in the morning.</p>

<p>"Old houses settle," the landlady said, pouring tea with steady hands.</p>

<p>Nora noted that she'd answered a different question.</p>

<p>The smell was stronger on the third day. Nora paused outside Room 4 and pressed her ear gently to the door and heard breathing. Slow, irregular breathing, like someone in a very deep sleep.</p>

<p>She went to the records office that afternoon and pulled the property history for the boarding house.</p>

<p>In 1987, a tenant in Room 4 had died. Elderly man, found three weeks after the fact. The official record was dry and brief. A neighbor's note in a separate file used the word "peaceful," which Nora suspected was the word people used when "disturbing" would frighten someone.</p>

<p>She went back to the boarding house. The landlady was out.</p>

<p>Nora stood outside Room 4 for a long time. The smell was the kind of sweet that was past sweet now, past anything pleasant, and the silence behind the door was not empty—it was full, thick, occupied.</p>

<p>The door was unlocked.</p>

<p>She pushed it open three inches.</p>

<p>The rocking chair in the corner was moving.</p>

<p>Slowly. Back and forth. With no one in it.</p>

<p>And on the seat, precisely centered, was a key. A room key, old brass, with a tag that read: <em>Room 7.</em></p>

<p>Nora closed the door. She walked upstairs. She packed her bag.</p>

<p>She was halfway out the front door when she heard, from somewhere above her, the slow and patient creak of a rocking chair beginning again.</p>`,
      coverImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
      featured: false,
    },
  ];

  console.log('\nCreating stories…');
  for (const s of stories) {
    const slug = s.slug;
    const existing = await prisma.story.findUnique({ where: { slug } });
    if (existing) {
      console.log(`  SKIP (exists): ${s.title}`);
      continue;
    }

    const story = await prisma.story.create({
      data: {
        title:      s.title,
        slug,
        content:    s.content,
        excerpt:    s.excerpt,
        coverImage: s.coverImage,
        status:     'PUBLISHED',
        featured:   s.featured,
        mood:       s.mood,
        authorId:   author.id,
        categoryId: categories[s.categorySlug],
      },
    });
    console.log(`  CREATED: ${story.title} (id=${story.id})`);
  }

  // ── 4. Create slideshow slides ─────────────────────────────────────────────
  const slides = [
    {
      title: 'Welcome to Silent Evidence',
      subtitle: 'The darkest stories live here. Read if you dare.',
      image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=1200&q=80',
      linkUrl: '/stories',
      order: 1,
    },
    {
      title: 'New: The Last Light on Hollow Street',
      subtitle: 'Every midnight, something in the abandoned house counts along with you.',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
      linkUrl: '/story/the-last-light-on-hollow-street',
      order: 2,
    },
    {
      title: 'Psychological Horror',
      subtitle: 'When the monster is inside your own mind.',
      image: 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=1200&q=80',
      linkUrl: '/category/psychological',
      order: 3,
    },
    {
      title: 'Write Your Own Horror',
      subtitle: 'Share your darkest stories with our community of horror readers.',
      image: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=1200&q=80',
      linkUrl: '/write',
      order: 4,
    },
    {
      title: 'Discover New Fears',
      subtitle: 'Swipe through stories matched to your horror preferences.',
      image: 'https://images.unsplash.com/photo-1548268770-66184a21657e?w=1200&q=80',
      linkUrl: '/discover',
      order: 5,
    },
  ];

  console.log('\nCreating slides…');
  for (const sl of slides) {
    const existing = await prisma.slide.findFirst({ where: { title: sl.title } });
    if (existing) {
      console.log(`  SKIP (exists): ${sl.title}`);
      continue;
    }
    const slide = await prisma.slide.create({ data: { ...sl, active: true } });
    console.log(`  CREATED: ${slide.title} (id=${slide.id})`);
  }

  console.log('\nDone!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
