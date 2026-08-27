// lib/discord.ts
//
// Posts announcements to a Discord channel via an incoming webhook. This is the
// serverless-friendly shape of a "Discord bot": no persistent gateway connection
// (which Vercel functions cannot hold), just an HTTP POST to a webhook URL when
// something worth announcing happens — a new story going live.
//
// SETUP: in Discord, Server Settings → Integrations → Webhooks → New Webhook,
// pick the channel, copy the URL, and set it as DISCORD_WEBHOOK_URL in the app's
// environment. Without it, these helpers no-op, so nothing breaks when it is off.
//
// This is intentionally separate from the OAuth role-granting integration in
// app/api/discord — that links accounts; this announces content.

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? 'https://silentevidence.com').replace(
  /\/$/,
  ''
);

/** True when a webhook is configured. */
export function discordEnabled(): boolean {
  return Boolean(WEBHOOK_URL);
}

interface StoryAnnouncement {
  title: string;
  slug: string;
  excerpt?: string | null;
  authorName?: string | null;
  categoryName?: string | null;
}

/**
 * Announces a newly published story to Discord as a rich embed. Fire-and-forget:
 * a webhook failure never affects the publish that triggered it, so every caller
 * should ignore the returned promise (or catch it). Returns false when Discord is
 * not configured.
 */
export async function announceNewStory(story: StoryAnnouncement): Promise<boolean> {
  if (!WEBHOOK_URL) return false;

  const url = `${BASE_URL}/story/${story.slug}`;
  const description = (story.excerpt ?? '').slice(0, 300);

  const embed = {
    title: story.title.slice(0, 256),
    url,
    description: description || undefined,
    color: 0xdc2626, // the site's red
    footer: {
      text: [story.categoryName, story.authorName ? `by ${story.authorName}` : null]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 2048),
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🕯️ **A new story has been published**',
        embeds: [embed],
        // Never let an embed's text ping @everyone/@here or roles.
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
