// lib/storyGraph.ts
// Builds an author's publication map: how much they have published, and how it
// clusters by category.
//
// WHY THE LAYOUT IS COMPUTED HERE
// Positions are calculated on the server and shipped as plain numbers, rather
// than run through a force simulation in the browser. Three reasons:
//   - a physics sim produces a different layout on every load, so the map a
//     writer shares today looks nothing like the one they open tomorrow;
//   - server-computed coordinates render identically on server and client, so
//     there is no hydration mismatch and no layout flash;
//   - it needs no charting dependency at all, and the only one installed
//     (recharts) does not do node graphs.
//
// The shape is deliberately hub-and-spoke: author at the centre, one node per
// category, stories orbiting their category. That reads as "here is everything
// you have written, grouped by what it is about" at a glance.

import { prisma } from '@/lib/prisma';

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  /** Drawn radius in SVG units. */
  r: number;
  kind: 'author' | 'category' | 'story';
  /** Story nodes link to the story; category nodes to the category page. */
  href?: string;
  /** Extra detail shown under the label on hover-capable devices. */
  meta?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
}

export interface StoryGraph {
  username: string;
  totals: {
    published: number;
    drafts: number;
    categories: number;
    views: number;
    likes: number;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** SVG viewBox sized to fit every node plus its label. */
  viewBox: string;
}

// Layout constants, in SVG units.
const CATEGORY_RING = 260; // distance from author to each category
const STORY_RING = 150; // distance from a category to its stories
const AUTHOR_R = 26;
const CATEGORY_R = 13;

/**
 * Story node radius, scaled by views.
 *
 * Uses a cube root rather than a linear scale: with linear sizing one story
 * with 50x the views of the rest renders as a blob that swallows its
 * neighbours. The cube root keeps differences legible while bounding the range.
 */
function storyRadius(views: number): number {
  return Math.max(5, Math.min(14, 5 + Math.cbrt(views) * 1.4));
}

export async function getStoryGraph(username: string): Promise<StoryGraph | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });
  if (!user) return null;

  const [stories, draftCount] = await Promise.all([
    prisma.story.findMany({
      where: { authorId: user.id, status: 'PUBLISHED' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        views: true,
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { likes: true } },
      },
    }),
    prisma.story.count({ where: { authorId: user.id, status: 'DRAFT' } }),
  ]);

  // Group by category. Stories with no category are collected under a single
  // "Uncategorised" bucket rather than dropped, so the totals on the page always
  // add up to the number of stories the author actually has.
  const buckets = new Map<
    string,
    {
      name: string;
      slug: string | null;
      stories: typeof stories;
    }
  >();

  for (const s of stories) {
    const key = s.category ? String(s.category.id) : 'none';
    if (!buckets.has(key)) {
      buckets.set(key, {
        name: s.category?.name ?? 'Uncategorised',
        slug: s.category?.slug ?? null,
        stories: [],
      });
    }
    buckets.get(key)!.stories.push(s);
  }

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  nodes.push({
    id: 'author',
    label: `@${user.username}`,
    x: 0,
    y: 0,
    r: AUTHOR_R,
    kind: 'author',
    meta: `${stories.length} published`,
  });

  const cats = [...buckets.entries()];
  const catCount = Math.max(1, cats.length);

  cats.forEach(([key, bucket], ci) => {
    // Categories evenly spaced around the author. The -PI/2 offset starts the
    // first category at the top, which keeps the layout stable and readable
    // rather than beginning at an arbitrary side.
    const angle = (ci / catCount) * Math.PI * 2 - Math.PI / 2;

    // Rings grow with category count so a prolific author's clusters do not
    // collide once there are more than a handful of categories.
    const ring = CATEGORY_RING + Math.max(0, catCount - 6) * 26;
    const cx = Math.cos(angle) * ring;
    const cy = Math.sin(angle) * ring;

    const catId = `cat-${key}`;
    nodes.push({
      id: catId,
      label: bucket.name,
      x: cx,
      y: cy,
      r: CATEGORY_R,
      kind: 'category',
      href: bucket.slug ? `/category/${bucket.slug}` : undefined,
      meta: `${bucket.stories.length} ${bucket.stories.length === 1 ? 'story' : 'stories'}`,
    });
    edges.push({ from: 'author', to: catId });

    // Stories fan out around their category, on the far side from the author so
    // they never overlap the hub.
    const n = bucket.stories.length;
    const spread = Math.min(Math.PI * 1.5, 0.55 * n + 0.5);
    const storyRing = STORY_RING + Math.max(0, n - 5) * 12;

    bucket.stories.forEach((s, si) => {
      // A single story sits straight out from its category; several are spread
      // evenly across the wedge centred on that same outward direction.
      const t = n === 1 ? 0 : si / (n - 1) - 0.5;
      const a = angle + t * spread;
      const sx = cx + Math.cos(a) * storyRing;
      const sy = cy + Math.sin(a) * storyRing;

      const sid = `story-${s.id}`;
      nodes.push({
        id: sid,
        label: s.title,
        x: sx,
        y: sy,
        r: storyRadius(s.views),
        kind: 'story',
        href: `/story/${s.slug}`,
        meta: `${s.views} ${s.views === 1 ? 'view' : 'views'} · ${s._count.likes} likes`,
      });
      edges.push({ from: catId, to: sid });
    });
  });

  // Fit the viewBox to the content with padding for labels, which extend well
  // past a node's radius. Falls back to a sane box when there is nothing to draw.
  const pad = 220;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs, 0) - pad;
  const maxX = Math.max(...xs, 0) + pad;
  const minY = Math.min(...ys, 0) - pad;
  const maxY = Math.max(...ys, 0) + pad;

  return {
    username: user.username,
    totals: {
      published: stories.length,
      drafts: draftCount,
      categories: cats.length,
      views: stories.reduce((n, s) => n + s.views, 0),
      likes: stories.reduce((n, s) => n + s._count.likes, 0),
    },
    nodes,
    edges,
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
  };
}
