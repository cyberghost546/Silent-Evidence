// scripts/seed-stories.ts
// Generates horror stories using Claude AI and seeds them into the database.
// Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-stories.ts
//
// Prerequisites:
//   - ANTHROPIC_API_KEY must be set in .env
//   - Database must be running and migrated
//   - At least one user and one category must exist in the DB
//
// Usage:
//   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-stories.ts          # generates 10 stories
//   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-stories.ts --count 50  # generates 50 stories
//
// The script creates stories attributed to existing users and distributes them
// across categories and moods for a well-populated horror platform.

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const ai = new Anthropic();

// All available horror moods — stories are distributed across these
const MOODS = ['CREEPY', 'PARANOID', 'DISTURBING', 'ATMOSPHERIC', 'PSYCHOLOGICAL', 'SUPERNATURAL', 'GORE', 'JUMPSCARE'] as const;

// Content ratings — weighted toward ALL so most content is accessible
const RATINGS = ['ALL', 'ALL', 'ALL', 'TEEN', 'TEEN', 'MATURE'] as const;

// Story length targets — variety keeps the platform interesting
const LENGTH_PROMPTS = [
  'Write a short horror story (about 500-800 words).',
  'Write a medium-length horror story (about 1000-1500 words).',
  'Write a longer horror story (about 2000-2500 words).',
] as const;

// Converts a title into a URL-safe slug with a random suffix
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

// Generates a single horror story using Claude AI
async function generateStory(mood: string, categoryName: string): Promise<{
  title: string;
  content: string;
  excerpt: string;
  warnings: string | null;
}> {
  const lengthPrompt = LENGTH_PROMPTS[Math.floor(Math.random() * LENGTH_PROMPTS.length)];

  const response = await ai.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `You are a horror fiction author for a platform called Silent Evidence. ${lengthPrompt}

Requirements:
- Mood: ${mood.toLowerCase()}
- Category: ${categoryName}
- Write in HTML format (use <p>, <em>, <strong>, <blockquote> tags for formatting)
- Include a compelling title
- Write an excerpt (1-2 sentences that hook the reader without spoilers)
- If the story contains graphic content, provide a brief content warning
- Make it genuinely scary and well-written — this is for a curated horror platform
- DO NOT include the title in the body text — it will be displayed separately

Reply with JSON only:
{
  "title": "Your Story Title",
  "content": "<p>Story body in HTML...</p>",
  "excerpt": "A one or two sentence hook.",
  "warnings": "Content warning if needed, or null"
}`,
      },
    ],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
  // Extract the JSON object from the response (handles markdown code blocks)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI response as JSON');

  return JSON.parse(jsonMatch[0]);
}

async function main() {
  // Parse --count argument (default: 10)
  const countArg = process.argv.find(a => a.startsWith('--count'));
  const count = countArg ? parseInt(countArg.split('=')[1] || process.argv[process.argv.indexOf('--count') + 1] || '10') : 10;

  console.log(`\nGenerating ${count} horror stories with Claude AI...\n`);

  // Fetch existing users and categories from the database
  const users = await prisma.user.findMany({
    where: { role: { in: ['AUTHOR', 'ADMIN'] } },
    select: { id: true, username: true },
  });

  if (users.length === 0) {
    // Fall back to any user if no authors/admins exist
    const anyUser = await prisma.user.findFirst({ select: { id: true, username: true } });
    if (!anyUser) {
      console.error('ERROR: No users found in database. Run seed-users.ts first.');
      process.exit(1);
    }
    users.push(anyUser);
  }

  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  if (categories.length === 0) {
    console.error('ERROR: No categories found in database. Create at least one category first.');
    process.exit(1);
  }

  let created = 0;
  let failed = 0;

  for (let i = 0; i < count; i++) {
    // Round-robin through moods, categories, and users for even distribution
    const mood = MOODS[i % MOODS.length];
    const category = categories[i % categories.length];
    const author = users[i % users.length];
    const rating = RATINGS[i % RATINGS.length];

    try {
      console.log(`  [${i + 1}/${count}] Generating ${mood} story in "${category.name}" by ${author.username}...`);

      const story = await generateStory(mood, category.name);
      const slug = slugify(story.title);

      await prisma.story.create({
        data: {
          title: story.title,
          slug,
          content: story.content,
          excerpt: story.excerpt || null,
          warnings: story.warnings || null,
          status: 'PUBLISHED',
          mood: mood as any,
          contentRating: rating as any,
          authorId: author.id,
          categoryId: category.id,
          // Randomize view counts so the platform looks lived-in
          views: Math.floor(Math.random() * 500) + 10,
        },
      });

      created++;
      console.log(`    -> "${story.title}" (${slug})`);

      // Small delay between API calls to avoid rate limiting
      if (i < count - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      failed++;
      console.error(`    -> FAILED: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\nDone! Created ${created} stories, ${failed} failed.\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
