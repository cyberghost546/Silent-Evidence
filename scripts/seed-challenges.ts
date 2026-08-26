// scripts/seed-challenges.ts
// Seeds the database with initial writing challenges to drive engagement.
// Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-challenges.ts
//
// Creates a mix of active and upcoming challenges across different horror themes.
// Each challenge has a prompt that encourages creative horror writing.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Challenge definitions — each becomes an active writing challenge on the platform
const challenges = [
  {
    title: '50-Word Flash',
    description:
      'Can you terrify someone in just 50 words? The shortest stories are often the scariest. Write a complete horror story in exactly 50 words — no more, no less.',
    prompt:
      'Write a horror story in exactly 50 words. Every word must count. Focus on a single terrifying moment, twist, or revelation. No setup wasted — drop us right into the fear.',
    daysFromNow: 0, // starts today
    durationDays: 14, // runs for 2 weeks
  },
  {
    title: "The Monster's Perspective",
    description:
      "What does the world look like through the eyes of the creature? Write a horror story told entirely from the monster's point of view. Make us sympathize with the thing under the bed.",
    prompt:
      'Write a horror story from the perspective of the monster, creature, or antagonist. First person only. The reader should understand why the monster does what it does — and be disturbed by how much sense it makes.',
    daysFromNow: 0,
    durationDays: 21,
  },
  {
    title: 'Found Footage',
    description:
      'Write a horror story in the style of found footage — journal entries, text messages, police reports, security camera transcripts. The format IS the story.',
    prompt:
      'Write a horror story using only found documents: diary entries, text message logs, police reports, voicemails, security footage transcripts, or social media posts. No traditional narration. The reader pieces together what happened from the fragments.',
    daysFromNow: 7,
    durationDays: 14,
  },
  {
    title: 'Childhood Fear',
    description:
      'Remember what scared you as a kid? The dark hallway, the closet door left open, the thing you saw from the corner of your eye. Write a story that makes that childhood fear real.',
    prompt:
      "Write a horror story based on a common childhood fear — the dark, the monster under the bed, being lost, a creepy toy, an imaginary friend that isn't imaginary. Make the fear real and justified. The protagonist can be a child or an adult confronting a childhood memory.",
    daysFromNow: 14,
    durationDays: 21,
  },
  {
    title: 'The Last Voicemail',
    description:
      "Someone left a voicemail. It's the last thing they ever recorded. Write the story around that final message — what led to it, and what came after.",
    prompt:
      "Your story must include a voicemail transcript as a central element. The voicemail is the last recording the person ever made. Build the horror story around what the message reveals, what it doesn't say, and what happened after the beep.",
    daysFromNow: 7,
    durationDays: 14,
  },
  {
    title: 'Quiet Drama',
    description:
      "No jump scares. No gore. No monsters. Write a horror story that's terrifying through atmosphere, dread, and the unsettling feeling that something is deeply wrong — without ever showing the threat directly.",
    prompt:
      'Write a horror story with zero gore, no jump scares, and no visible monsters or threats. The tension must come entirely from atmosphere, implication, and emotional depth. The most powerful thing is what the reader feels, not what you describe.',
    daysFromNow: 21,
    durationDays: 21,
  },
  {
    title: 'Two-Sentence Story',
    description:
      'The ultimate test of horror economy. Tell a terrifying story in exactly two sentences. Submit as many entries as you want — quantity breeds quality.',
    prompt:
      'Write a horror story in exactly two sentences. The first sentence should establish a normal situation. The second sentence should shatter it. Make every word carry maximum dread.',
    daysFromNow: 0,
    durationDays: 30,
  },
  {
    title: 'The Wrong House',
    description:
      "You walk into a house. It looks like yours. Everything is in the right place. But something is wrong. Something is very, very wrong. Write the story of realizing the house you're in isn't yours.",
    prompt:
      'Write a horror story about entering a place that looks familiar — your house, your office, your childhood home — but realizing something is subtly, then terrifyingly, wrong. The wrongness should escalate gradually.',
    daysFromNow: 14,
    durationDays: 14,
  },
];

async function main() {
  console.log('Seeding writing challenges...\n');

  for (const c of challenges) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + c.daysFromNow);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + c.durationDays);

    // Check if a challenge with this title already exists to avoid duplicates
    const existing = await prisma.challenge.findFirst({ where: { title: c.title } });
    if (existing) {
      console.log(`  SKIP: "${c.title}" (already exists)`);
      continue;
    }

    await prisma.challenge.create({
      data: {
        title: c.title,
        description: c.description,
        prompt: c.prompt,
        startDate,
        endDate,
        active: c.daysFromNow === 0, // only activate challenges starting today
      },
    });

    const status = c.daysFromNow === 0 ? 'ACTIVE' : `starts in ${c.daysFromNow} days`;
    console.log(`  CREATED: "${c.title}" (${status}, ${c.durationDays}-day run)`);
  }

  console.log('\nDone! Challenges seeded successfully.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
