// =============================================================================
// app/admin/bundles/page.tsx — Story Bundle Management (Server Component)
// =============================================================================
//
// PURPOSE:
//   Allows the admin to create, edit, and delete "bundles" — curated collections
//   of published stories grouped under a single title (e.g. "Halloween Reads").
//   Bundles can be featured on the homepage or in the navigation.
//
// ACCESS CONTROL:
//   Double-layered auth check in this file:
//     1. Cookie guard — must have a valid `userId` cookie, else → /login.
//     2. Role guard   — that user must have role === 'ADMIN', else → home (/').
//   This is redundant with the admin layout guard but adds defence-in-depth:
//   if the layout is bypassed (e.g. direct API access, misconfiguration), this
//   page still refuses to render for non-admins.
//
// DATA SOURCES:
//   - prisma.storyBundle — all bundles with their associated story items.
//   - prisma.story       — the most recent 200 published stories, used to
//                          populate the "add story to bundle" picker in the UI.
//
// KEY PATTERNS:
//   - Promise.all for parallel DB queries (bundles + stories).
//   - JSON serialisation before passing Prisma results to the Client Component.
// =============================================================================

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminBundlesClient from './AdminBundlesClient';

export default async function AdminBundlesPage() {
  // ── Auth guard: step 1 — must be logged in ────────────────────────────────
  const cookieStore = await cookies();
  // `?? 0` ensures we get 0 (falsy) when the cookie is absent, rather than NaN.
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  // ── Auth guard: step 2 — must be an admin ────────────────────────────────
  // We only select the `role` column — no need to pull the full user object
  // when we only care about one field. This keeps the query fast and the
  // data transfer minimal.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  // Redirect non-admins (including null — user deleted since cookie was set)
  if (user?.role !== 'ADMIN') redirect('/');

  // ── Parallel data fetch ───────────────────────────────────────────────────
  // Both queries are independent, so we fire them simultaneously with
  // Promise.all. Total wait time = max(bundleQuery, storiesQuery) rather than
  // bundleQuery + storiesQuery.
  const [bundles, allStories] = await Promise.all([
    // Fetch all bundles newest-first, with their items and each item's story
    // details (id, title, slug) for display in the bundle editor.
    // Nested include: StoryBundle → StoryBundleItem → Story (partial select)
    prisma.storyBundle.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            story: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    }),

    // Fetch the 200 most recent published stories for the "add story" picker.
    // Capped at 200 to keep the picker responsive; older stories are rarely
    // added to new bundles. `status: 'PUBLISHED'` excludes drafts/scheduled.
    prisma.story.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true },
      take: 200,
    }),
  ]);

  return (
    <AdminBundlesClient
      // Serialise bundles through JSON to strip Prisma Date objects before
      // crossing the server→client boundary. Without this, Next.js throws:
      // "Only plain objects can be passed to Client Components from Server Components."
      initialBundles={JSON.parse(JSON.stringify(bundles))}
      // allStories only contains primitive fields (id, title, slug — all strings
      // or numbers), so no extra serialisation step is needed here.
      allStories={allStories}
    />
  );
}
