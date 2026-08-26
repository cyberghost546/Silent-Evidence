// prisma/seed-series-demo.ts
// Turns "The Camera That Learned to Wait" into a two-part series, and writes
// the second part.
//
// Run with: npm run db:seed:series
//
// This exists to prove the series feature end to end: the model, the ownership
// rules, seriesOrder, and SeriesNav on the story page had all been built, but
// no story had ever been in a series because the API silently dropped the
// field. This creates the first real one.
//
// Idempotent — re-running leaves everything exactly as it is.

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

const SERIES_SLUG = 'the-east-stairwell';
const PART_ONE_SLUG = 'the-camera-that-learned-to-wait';
const PART_TWO_SLUG = 'nineteen-cameras';

const PART_TWO_CONTENT = `<p>I did not go back to the building. I want that on the record before anything else, because of what people assume afterwards.</p>
<p>What I did was resign by email on the Monday, and then spend four months being extremely reasonable about it. I told my sister it was the hours. I told my GP it was the hours. I got a job on a trading estate watching eleven cameras instead of nineteen, all of them fixed, none of them motion-triggered, and for a while that was enough.</p>
<p>The thing that started it again was ordinary. It is always ordinary.</p>
<p>A man called Dunphy took over my old shift at Bridehollow House. I did not know him. He found me through the union forum in October and sent three messages over two days, and the third one just said: <em>please</em>.</p>
<p>We met in a Wetherspoons near the station because he did not want to talk on the phone.</p>
<p>He had the same look I had had. I recognised it the way you recognise your own handwriting on an envelope. He asked me, before he had even sat down properly, whether camera 12 had ever done anything strange when I was there.</p>
<p>I said yes. I told him about the eleven seconds and the framing and the bracket and the tightening.</p>
<p>He listened to all of it with his hands around a pint he did not drink, and then he said the thing I have not been able to put down since.</p>
<p>&ldquo;It&rsquo;s not camera 12 any more,&rdquo; he said. &ldquo;It&rsquo;s camera 4.&rdquo;</p>
<p>Camera 4 covers the loading bay. It is at the other end of the building, on a different floor, on a different circuit, and it was replaced entirely in the refit two summers ago. There is no shared mount, no shared cabling, no shared anything except a switch in a cupboard and the fact that both of them point at places where people are not.</p>
<p>Eleven seconds. 3:40 in the morning. A degree or two a night.</p>
<p>I asked him the only question that mattered. I asked what it was pointing at now.</p>
<p>He got out his phone and showed me a photograph of a monitor, which is a stupid way to look at anything, and I looked at it for a long time anyway.</p>
<p>The loading bay. The roller door. And in the bottom right of the frame, at the very edge, the corner of the fire exit that leads back into the stairwell.</p>
<p>&ldquo;How long,&rdquo; I said.</p>
<p>&ldquo;Nine weeks. Maybe ten.&rdquo;</p>
<p>I did the arithmetic on a beer mat, because that is apparently the kind of man I am now, and I got eleven weeks, and I told him eleven, and he said that was close enough to what he had got.</p>
<p>Here is what I have worked out, in fourteen months of thinking about almost nothing else.</p>
<p>It is not moving towards the security office. That was my mistake, and it was a comfortable mistake, because a thing that wants to look at the office is a thing with an interest in me, and being the subject of something is at least a kind of importance.</p>
<p>It is surveying. Slowly, patiently, eleven seconds at a time, one camera at a time, it is building a picture of a building it cannot otherwise see. Camera 12 was not the first. There is no reason at all to think camera 4 will be the last.</p>
<p>Dunphy asked me what he should do. He was not really asking. People in that state are never really asking.</p>
<p>I told him the truth, which is that his supervisor will tighten the bracket, and be kind about it, and not be stupid, and simply not see it. And that he will watch the numbers get smaller for eleven weeks. And that he will have to decide, entirely on his own, in a room at four in the morning, whether to be the person who leaves.</p>
<p>He asked whether leaving worked.</p>
<p>I have thought about lying to him. I did not lie to him.</p>
<p>I told him I stopped being able to sleep facing a window in March, and that I have four cameras in my own flat now, and that I check the framing on all four of them every morning against a photograph I took the day I installed them.</p>
<p>And that so far, so far, none of them has moved.</p>`;

async function main() {
  const keeper = await prisma.user.findUnique({
    where: { username: 'the_keeper' },
    select: { id: true },
  });
  if (!keeper) {
    console.error('System author "the_keeper" not found.');
    process.exit(1);
  }

  const partOne = await prisma.story.findFirst({
    where: { slug: PART_ONE_SLUG },
    select: { id: true, title: true, categoryId: true, seriesId: true },
  });
  if (!partOne) {
    console.error(`Part one ("${PART_ONE_SLUG}") not found. Run npm run db:seed:stories:new first.`);
    process.exit(1);
  }

  // ── The series ───────────────────────────────────────────────────────────
  let series = await prisma.series.findUnique({ where: { slug: SERIES_SLUG } });
  if (series) {
    console.warn(`  · series already exists: ${series.name}`);
  } else {
    series = await prisma.series.create({
      data: {
        name: 'The East Stairwell',
        slug: SERIES_SLUG,
        description:
          'A night watchman notices that one camera has begun to move. Two parts.',
        authorId: keeper.id,
      },
    });
    console.warn(`  ✓ created series: ${series.name}`);
  }

  // ── Part one joins the series ────────────────────────────────────────────
  if (partOne.seriesId === series.id) {
    console.warn(`  · part 1 already in series`);
  } else {
    await prisma.story.update({
      where: { id: partOne.id },
      data: { seriesId: series.id, seriesOrder: 1 },
    });
    console.warn(`  ✓ part 1: ${partOne.title}`);
  }

  // ── Part two ─────────────────────────────────────────────────────────────
  const existingTwo = await prisma.story.findFirst({
    where: { slug: PART_TWO_SLUG },
    select: { id: true },
  });

  if (existingTwo) {
    console.warn(`  · part 2 already exists`);
  } else {
    await prisma.story.create({
      data: {
        title: 'Nineteen Cameras',
        slug: PART_TWO_SLUG,
        excerpt:
          'I left the building. Fourteen months later the man who took my shift found me, and told me it had started again on a different camera.',
        content: PART_TWO_CONTENT,
        status: 'PUBLISHED',
        authorId: keeper.id,
        // Same category as part one — a sequel belongs beside its original.
        categoryId: partOne.categoryId,
        mood: 'PARANOID',
        contentRating: 'TEEN',
        coverImage: `https://picsum.photos/seed/${PART_TWO_SLUG}/800/400`,
        seriesId: series.id,
        seriesOrder: 2,
      },
    });
    console.warn(`  ✓ part 2: Nineteen Cameras`);
  }

  const inSeries = await prisma.story.findMany({
    where: { seriesId: series.id },
    orderBy: { seriesOrder: 'asc' },
    select: { seriesOrder: true, title: true, slug: true },
  });

  console.warn(`\n"${series.name}" now has ${inSeries.length} parts:`);
  for (const s of inSeries) {
    console.warn(`  ${s.seriesOrder}. ${s.title}  (/story/${s.slug})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
