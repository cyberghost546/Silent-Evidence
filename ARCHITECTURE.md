# Silent Evidence — Architecture Guide

A horror-fiction community platform: readers browse and comment on stories, authors
write and monetise them, admins moderate everything from a 48-page control panel.

This guide is for engineers new to the codebase. It describes `origin/main` as of
2026-09-21. Where the code and the intent disagree, this document follows the code
and says so.

**Scale:** ~110 Prisma models, 223 API route handlers, 177 UI components, 48 admin
pages, plus an Expo mobile client.

---

## 1. Architecture

### The stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2 (App Router) + React 19.2 |
| Database | MySQL 8 / MariaDB via Prisma 7 with `@prisma/adapter-mariadb` |
| Styling | Tailwind CSS v4 |
| Cache | Redis via `ioredis` (optional) |
| Validation | Zod |
| Tests | Vitest |
| Deploy | Vercel (`vercel.json` crons) or Docker Compose |

### Three kinds of code

**Server Components** are the default. Every `page.tsx` that does not say
`'use client'` runs only on the server, queries Prisma directly, and ships zero
JavaScript for its own logic. `app/page.tsx` is the model: it imports ~25 section
components and wraps each in `<Suspense>` so a slow query in one section does not
block the rest of the page from streaming.

**Client Components** — 231 files carrying `'use client'` — handle anything needing
browser APIs or interactivity: the Tiptap editor, carousels, Recharts charts, filter
pills, Pusher subscriptions. The recurring pattern is a server/client pair: a server
component does the database work and passes plain data down. `Slideshow.tsx` (server,
queries `Slide`) then `SlideshowClient.tsx` (client, runs the carousel) is the
clearest example, and `AnalyticsCharts` / `AdminSlidesClient` follow it.

**Route handlers** under `app/api/**/route.ts` (223 of them) serve the client
components, the mobile app, Stripe webhooks, and cron. The largest groups are
`admin` (44), `user` (14), `stories` (14), `auth` (11), `app` (9, mobile-only) and
`stripe` (8).

### How a request travels

```
Browser
  |
  v
middleware.ts  -- Edge runtime, runs on everything except static assets
  |   1. Rate-limit mutating /api/* calls (POST/PATCH/PUT/DELETE) per IP+route family
  |   2. Verify the userId cookie's HMAC signature; strip it if forged
  |   3. Gate /admin/* -- redirect to /login if unauthenticated (no DB hit)
  v
Server Component  --or--  Route Handler
  |                         Zod parse -> session check -> business logic
  v
lib/cache.ts (Redis)  -- hit? return immediately. miss? continue
  v
lib/prisma.ts  -- singleton PrismaClient, MariaDB adapter, cached on globalThis
  v
MySQL
```

Three details worth internalising:

- **Rate limiting runs before any database work.** A request that will be rejected
  should cost nothing. The key is the endpoint *family* (`/api/likes`), not the full
  path — keying on the full path would let an attacker get a fresh budget per id.
- **There are two rate limiters.** `lib/edgeRateLimit.ts` is per-instance and covers
  every mutating route from middleware. `lib/rateLimit.ts` is Redis-backed, shared
  across instances, and used explicitly by the auth routes. They are layered, not
  alternatives.
- **Redis is optional everywhere.** `getRedis()` returns `null` when `REDIS_URL` is
  unset or the client has given up reconnecting, and every caller silently falls
  back to the database. Same pattern for Pusher and Web Push: missing config
  degrades the feature rather than crashing the app.

### Cross-cutting helpers

`lib/` holds 42 single-purpose modules. The ones you will touch first:

| File | Role |
|---|---|
| `prisma.ts` | DB client singleton; parses `DATABASE_URL` into adapter fields |
| `session.ts` | `getSessionUserId`, `getSessionUser`, `requireAuth`, `requireAdmin` |
| `sessionCookie.ts` | HMAC sign/verify of the session; cookie options |
| `cache.ts` | `cache(key, ttl, fetcher)` plus `invalidatePattern` |
| `apiError.ts` | Consistent `badRequest` / `unauthorized` / `serverError` responses |
| `env.ts` | Startup validation; throws on missing required vars, warns on optional |
| `sanitize.ts` | HTML sanitisation for user-submitted story content |

---

## 2. Data model

The schema lives in `prisma/schema.prisma` (2,670 lines) and is unusually well
commented — read it directly when you need detail. The structure below is the part
that matters for orientation.

### Core entities

**User** is the hub; nearly every other model has a foreign key back to it. It holds
identity (`email`, `username`, bcrypt `password`), authorisation (`role`), and — this
trips people up — the **trust and moderation flags**:

- `isVerified` — the admin-granted blue checkmark shown on profiles and stories
- `emailVerified` — a different thing entirely: they clicked the link in their email
- `isBanned`, `suspendedUntil`, `isPrivate`, `sessionVersion`
- `ageGroup` (`UNDER_13` / `TEEN` / `ADULT`), derived from `dateOfBirth` at registration

**Profile** is a separate optional table, one row per user, created on first save via
upsert. It exists so the `User` table stays lean for auth lookups. Everything
cosmetic or descriptive lives here: **`avatar`**, `bio`, `website`, `fearMoods`
(a comma-separated list of up to three `Mood` values), `merchUrl`, `profileTheme`,
`avatarBorder`.

> The split is the single most common source of confusion. `avatar` is on
> **Profile**; `isVerified` is on **User**. A query that needs both must include the
> profile relation.

**Category** — broad genre buckets (Ghost Stories, Psychological Horror,
Supernatural…). Seeded by developers, *not* user-created. Each story belongs to
exactly one. `slug` drives `/category/[slug]`.

**Tag** — fine-grained, many-to-many with Story through the `StoryTags` relation.
Users can follow tags (`TagFollow`) to be notified about new stories using them.

**Story** is the main content unit. One author, one category, many tags. Its fields
cluster into groups:

- *Content:* `title`, `slug`, `content` (LongText HTML), `excerpt`, `coverImage`
- *Lifecycle:* `status` (`DRAFT` / `PUBLISHED` / `ARCHIVED` / `SCHEDULED`), `scheduledAt`
- *Classification:* `mood`, `contentRating`, `warnings`, `language`, `deathCount`
- *AI-derived:* `scareScore` (1–10), `scareReason`
- *Monetisation:* `price` (cents, null = free), `isPremiumOnly`, `earlyAccessUntil`, `tipGoal*`
- *Media:* `audioUrl`, `videoUrl`, `spotifyPlaylistUrl`
- *Placement:* `featured`, `creepyOfMonth`, `seriesId` + `seriesOrder`, lat/lng for the story map

It carries 12 indexes covering the real query patterns — browse by author, category
or mood, sort by newest or views, filter by content rating for age-gating.

**Slide** powers the homepage hero carousel: `title`, `subtitle`, `image`, `linkUrl`,
`order` (ascending), `active`. Admin-managed; `active: false` hides a slide without
deleting it.

### Everything else

The remaining ~100 models are feature tables, and they group cleanly:

- **Engagement:** `Like`, `Reaction`, `Bookmark`, `Comment`, `CommentReaction`, `ScareRating`, `ReadingHistory`
- **Social:** `Follow`, `BlockedUser`, `DirectMessage`, `Group`, `Squad`, `BookClub`, `Forum`
- **Gamification:** `UserBadge`, `ReadingStreak`, `WritingStreak`, `ReadingGoal`, `Challenge`, `BingoCard`, `ScreamAward`
- **Monetisation:** `Subscription` (reader), `AuthorSubscription` (Author Pro), `Tip`, `StoryPurchase`, `ChapterPurchase`, `StoryBundle`, `BundlePurchase`
- **Moderation and audit:** `Report`, `UserWarning`, `BannedWord`, `AuditLog`, `LoginLog`, `SecurityAlert`, `EmailLog`
- **Collaboration:** `StoryCollaborator`, `CoauthorRequest`, `BetaReaderInvite`, `ChainStory`, `DraftShareToken`

Two subscription models is deliberate: `Subscription` is the reader membership,
`AuthorSubscription` is Author Pro. They are independent purchases — a user can hold
both, either, or neither. `authorGrandfathered` on User grants Pro access to authors
who predate the paywall, and is set only by `npm run db:grandfather-authors`.

### Enums

`Role` (GUEST/USER/AUTHOR/ADMIN), `StoryStatus`, `Mood` (9 horror values),
`ContentRating`, `AgeGroup`, `ReactionType`, `NotificationType`,
`ReportType`/`ReportReason`/`ReportStatus`, `GroupRole`.

`Mood` must be kept in step with `MOODS` in `lib/moods.ts`, which is the
application-side source of truth for labels, descriptions and colours. The schema
comment records why this matters: the enum once held generic-fiction labels while the
admin tools and AI generators wrote horror vocabulary, so those inserts failed at the
database.

---

## 3. Authentication

There is no NextAuth. The session is two cookies.

### The cookie pair

| Cookie | Contents |
|---|---|
| `userId` | the user's integer primary key, in plain text |
| `userId_sig` | base64url HMAC-SHA256 of that integer, keyed by `SESSION_SECRET` |

Both are `httpOnly`, `sameSite: lax`, `secure` in production, `maxAge` 7 days.

The signature exists because the session was originally a bare `userId=<number>`
cookie — anyone could open dev-tools, set `userId=1`, and become that account,
including an admin. Rather than rewrite the ~130 handlers that read the cookie with
`Number(...)`, `lib/sessionCookie.ts` added the second cookie and `middleware.ts`
verifies it centrally on every request. A `userId` whose signature does not match is
**stripped from the request headers** before any handler runs, so downstream code
sees an anonymous user. The plain-integer cookie stays readable and every existing
handler keeps working.

Signing uses the Web Crypto API (`crypto.subtle`) rather than Node's `crypto`,
because middleware runs on the Edge runtime and route handlers run on Node — one
implementation has to work in both. Verification uses `crypto.subtle.verify`, which
compares in constant time.

`SESSION_SECRET` is required and must be at least 16 characters (the guidance in the
code recommends 32+, via `openssl rand -hex 32`). `getKey()` throws without it —
sessions cannot be signed.

### Reading the session

Use `lib/session.ts`, not the cookie:

```ts
getSessionUserId()  // number | null      cheapest; verifies signature, no DB hit
getSessionUser()    // SessionUser | null adds a DB lookup for role/username/email
requireAuth()       // SessionUser | null
requireAdmin()      // SessionUser | null null unless role === 'ADMIN'
```

Note that `getSessionUserId` re-verifies the HMAC even though middleware already did.
That is deliberate defence in depth.

Many older handlers and pages still do `Number(cookieStore.get('userId')?.value ?? 0)`
directly — `app/admin/layout.tsx`, `app/search/page.tsx` and `app/api/stories/route.ts`
among them. This is safe **only** because middleware strips forged cookies first. New
code should use the `lib/session.ts` helpers.

### Login

`POST /api/auth/login`:

1. Rate limit — 5 attempts per IP per 15 minutes, Redis-backed.
2. Zod validation; email lowercased and trimmed.
3. `bcrypt.compare` against the stored hash. A missing user and a wrong password
   return the *same* generic 401, to prevent account enumeration.
4. On failure: write a `LoginLog` row (IP anonymised, geo-looked-up in parallel) and
   run `onFailedLogin` intrusion detection. Neither is awaited — detection must never
   slow authentication.
5. Account lockout is checked **after** the password comparison, on purpose. Checking
   first would make the endpoint an enumeration oracle, since a locked account would
   answer differently from an unknown one.
6. If `twoFactorEnabled`: generate a 6-digit code, delete previous unused codes,
   store it with a 10-minute expiry, email it, and return **202** with `requires2fa`
   and `tempUserId`. No cookie is set — the user is not yet authenticated.
7. Otherwise `setSessionCookies(res, user.id)` and log the success.

OAuth (`/api/auth/google`, `/api/auth/microsoft`) and `/api/auth/2fa/verify` end at
the same `setSessionCookies` call.

### Logout

`GET /api/auth/logout` calls `clearSessionCookies` (sets both cookies to `maxAge: 0`)
and redirects to `NEXT_PUBLIC_BASE_URL`.

### Route protection

Two layers for admin:

1. **`middleware.ts`** redirects unauthenticated `/admin/*` requests to
   `/login?from=<path>` without touching the database.
2. **`app/admin/layout.tsx`** then does the real check: look up the user, and
   `redirect('/')` unless `role === 'ADMIN'`. Because it is a layout, it wraps all 48
   admin pages automatically — one check to maintain instead of 48 chances to forget
   one.

Several admin pages (`app/admin/analytics/page.tsx` for instance) repeat the role
check inline. Redundant, but harmless.

API routes protect themselves individually with `requireAdmin()` or a local
`isAdmin()` helper.

### Verified users

Two independent flags, easily conflated:

- **`emailVerified`** — proved control of the inbox, via `EmailVerificationToken`.
- **`isVerified`** — an admin-granted author checkmark, requested through
  `/apply-for-verification` and displayed next to the author's name.

`SessionUser.verified` maps to `isVerified`, the checkmark — not the email state.

Access tiers beyond the role enum: `ageGroup` filters which `contentRating` values a
reader may see; `Subscription` gates premium stories; `AuthorSubscription` and
`authorGrandfathered` gate Author Pro publishing fields.

---

## 4. Content flow

### Writing

`/write` renders `RichEditor.tsx`, a Tiptap WYSIWYG wrapped in `next/dynamic` with
`ssr: false` (editors need the DOM). Extensions: StarterKit, Underline, Placeholder,
CharacterCount — giving bold, italic, underline, headings, lists, blockquotes,
horizontal rules, undo/redo and a live word count.

It is a controlled component: the parent owns the HTML string and receives
`onChange(html, wordCount)`. Ctrl/Cmd+S fires an optional `onSave` for autosave. When
the parent pushes new `value` HTML — after an autosave or a template injection — the
editor syncs without triggering an `onChange` loop.

Content is stored as **HTML** in `Story.content` (LongText).

### Saving

`POST /api/stories` runs a fixed pipeline:

1. **CSRF** — `verifyCsrfToken`
2. **Zod** — `CreateStorySchema`; title ≤200 chars, content ≤100,000, `categoryId`
   required and positive, `price` 0–100,000 cents
3. **Sanitise** — `sanitizeContent` strips dangerous HTML from the Tiptap output
4. **Toxicity** — `checkStoryToxicity` (Claude Haiku)
5. **Mood detect** — `detectMood` fills `mood` when the author left it blank
6. **Author Pro gate** — `enforceAuthorProFields` rejects paid-only fields (`price`,
   early access, and so on) from non-Pro authors. This cannot live in the Zod schema,
   because schema validation cannot see who is making the request.
7. **Write**, then **invalidate** the affected Redis keys and fire `sendPushToUser`
   notifications to followers.

### Categorising

`categoryId` is mandatory — every story has exactly one category, chosen from the
seeded list. Tags are optional and many-to-many. Mood is a single enum value, either
author-chosen or AI-detected.

### Publishing

`status` drives visibility:

- `DRAFT` — author only. Shareable via `DraftShareToken`.
- `PUBLISHED` — live.
- `SCHEDULED` — `/api/cron/publish-scheduled` runs **every 15 minutes**
  (`*/15 * * * *`) and flips stories whose `scheduledAt` has passed.
- `ARCHIVED` — hidden but restorable.

Chaptered stories (`isChaptered`) use `StoryChapter`, which supports per-chapter
purchase via `ChapterPurchase`.

### Reaching readers

`GET /api/stories` returns published stories filtered by the viewer's age group —
`UNDER_13` sees `ALL`, `TEEN` sees `ALL` plus `TEEN`, `ADULT` sees everything — with
the age group baked into the Redis cache key so tiers never share a cached page. The
homepage composes ~25 independent server components, each streaming behind its own
Suspense boundary.

---

## 5. Reader features

### Search and filtering

`app/search/page.tsx` is a server component; all filtering is DB-side from URL params:
`?q=`, `?category=`, `?mood=`, `?readTime=`, `?sort=`, `?page=`. `SearchStories.tsx`
is the client half handling the filter UI.

`q` searches title, excerpt, content, category, author and tags via a Prisma `OR` of
`contains` clauses, which compiles to `LIKE`. There is deliberately **no
`mode: 'insensitive'`** — MySQL's default collation is already case-insensitive, so
adding it would be redundant. Be aware this is a portability trap: the same code on
PostgreSQL would become case-*sensitive* and silently return fewer results.

A query also searches usernames, surfacing up to 6 accounts in a "People" section
above the stories.

`readTime` is the exception to DB-side filtering. Reading time is derived from
content length, and Prisma cannot filter on a computed value, so the page fetches up
to 200 rows and filters in JS — `mins = content.length / 5 / 200` — then paginates
the filtered array in memory. Without a `readTime` filter, normal `skip`/`take`
pagination is used. The tradeoff is explicit: over-fetching instead of a precomputed
`wordCount` column.

`filterHref()` merges current params with overrides so each filter pill changes one
dimension and preserves the rest.

### Homepage hero slides

`Slideshow` (server) queries `Slide` where `active: true`, ordered by `order`
ascending, and hands the rows to `SlideshowClient` for the carousel. Admins manage
slides at `/admin/slides` through `/api/Slide` (note the capital S in the route path)
with image upload via `/api/Slide/upload` into `public/uploads/slides/`.

One inconsistency: `GET /api/Slide` returns **all** slides including inactive ones and
is unauthenticated, while the server component correctly filters to active. Harmless
today — slides are not secret — but the API is not the one the homepage uses.

### Category browsing

`/category/[slug]` lists a category's stories. Categories come from the seeded set and
appear in the header dropdown and the homepage `CategoriesShowcase`.

---

## 6. Integrations

| Integration | State | Notes |
|---|---|---|
| Stripe | **Fully wired** | 8 routes plus a signature-verified webhook |
| Web Push (VAPID) | **Fully wired** | Auto-prunes dead subscriptions |
| Pusher | **Wired, degrades to polling** | No-ops without config |
| Redis (ioredis) | **Wired, optional** | Falls back to the DB |
| Anthropic SDK | **Fully wired** | 8 features, plus an Ollama fallback |
| Cloudinary | Present | `lib/cloudinary.ts`; local `public/uploads` also used |
| Nodemailer | **Fully wired** | Transactional mail, 2FA codes, newsletters |
| OAuth (Google/Microsoft) | Wired | Optional; warns when unset |

**Stripe** (`lib/stripe.ts`) lazily constructs the client so the app boots without a
key; a `Proxy` keeps the legacy `import { stripe }` style working. Checkout routes
cover reader subscriptions, Author Pro, single-story purchases and tips, plus a
billing portal and a cancel route. `/api/stripe/webhook` verifies the HMAC with
`constructEvent` and handles `checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted` and
`invoice.payment_failed`; anything else is logged as unhandled.

**Web Push** (`lib/webpush.ts`) sends to every `PushSubscription` row for a user and
deletes subscriptions that return 410 or 404. Requires `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_EMAIL`, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` set to the same
value as the public key. Skips silently when unconfigured.

**Pusher** (`lib/pusher.ts`) needs all four of `PUSHER_APP_ID`, `PUSHER_KEY`,
`PUSHER_SECRET`, `PUSHER_CLUSTER`; if any is missing the factory returns `null` and
every trigger is a no-op, leaving the app on its existing polling behaviour.
Channels: `private-user-{id}` for DMs and notifications, `presence-room-{code}` for
reading rooms, public `stories` for new-story broadcasts.

**Redis** (`lib/cache.ts`) exposes `cache(key, ttl, fetcher)` and `invalidatePattern`,
namespaced with the `se:` prefix. Configured to fail fast — `maxRetriesPerRequest: 0`,
3 reconnect attempts, `enableOfflineQueue: false`, `lazyConnect` — and returns `null`
once the client reaches `end`/`close`, so callers transparently hit the database.
`getRedisClient()` shares the singleton with the rate limiter.

**Anthropic** (`@anthropic-ai/sdk`) is used in eight places: writing suggestions
(`/api/ai/suggest` — continue, opening paragraph, or title ideas), admin story
generation and batch generation, toxicity checking, scare scoring, AI
recommendations, writing prompts, and the chat endpoint. Models in the code today are
`claude-haiku-4-5-20251001` for the cheap high-volume calls and `claude-opus-4-6` for
generation. `lib/toxicityCheck.ts` and the chat route fall back to a self-hosted
Ollama (`OLLAMA_BASE_URL`, default model `llama3.2:3b`) when configured. Without
`ANTHROPIC_API_KEY` the app boots and warns; AI features are disabled.

---

## 7. Analytics

### Admin analytics — `/admin/analytics`

A server component with no caching, so numbers are always live on reload. It shows:

- **Four stat cards:** total users, published stories, comments, summed views
  (`story.aggregate({ _sum: { views: true } })`)
- **Two line charts, last 14 days:** new signups per day, new stories per day
- **One bar chart, all time:** story count per category, via
  `_count: { select: { stories: true } }` ordered by count descending

Charts are `SignupsChart`, `StoriesChart` and `CategoryChart` from
`app/components/ui/AnalyticsCharts.tsx` — Recharts, client-side, fed plain arrays.

The time series is built by looping `i = 13` down to `0`, computing each day's
midnight and 23:59:59.999 bounds, and running three `count` queries per day with
`Promise.all`. That is **42 queries per page load**, and it is the first thing to
optimise if the page gets slow — a single `GROUP BY DATE(createdAt)` raw query would
replace all of them.

### Author dashboard — `/dashboard`

`DashboardClient.tsx` gives authors their own Recharts views: a views-over-time line
chart and a followers-over-time line chart (both switchable between 7d and longer
periods, with x-axis tick density adjusted per period), and a horizontal bar chart
ranking their stories by views. Data comes from `lib/authorAnalytics.ts` and
`/api/stories/[id]/analytics`.

Other data surfaces: `/admin/funnel` over `FunnelEvent` rows, `/admin/heatmap`,
`/admin/health`, `/admin/audit-log` over `AuditLog`, and `/admin/email-log`.
`StoryAnalytics.tsx` renders per-story charts.

---

## 8. Mobile app

> **The path in the brief is wrong.** There is no `SilentEvidenceApp/` directory. The
> Expo app lives at the **repository root**, sharing it with the Next.js app:
> `app.json` (slug `SilentEvidenceApp`), source in `src/`, images in `assets/`.

Expo Router, typed routes, React Compiler enabled, dark UI, scheme `silentevidence`,
bundle id `com.silentevidence.app`. Screens: home feed, explore, following, bookmarks,
notifications, login, `profile/[username]`, `story/[slug]`. Plugins: expo-router,
expo-splash-screen, expo-notifications, expo-secure-store.

### How it reaches the backend

`src/lib/api.ts` exports a hardcoded `BASE_URL = 'http://192.168.1.210:3000'` — a
developer's LAN IP, since `localhost` means the phone itself on a physical device.
**This must be changed to your own IP, and it is not environment-driven.**

`apiFetch(path, options)` sets JSON content-type and attaches an **`x-user-id`**
header from the stored auth. `src/lib/auth.ts` persists `{ userId, username }` in
`expo-secure-store` with an in-memory cache, so the user stays logged in across
restarts.

The app talks to a dedicated `/api/app/*` surface — `auth/login`, `bookmarks`,
`following/feed`, `notifications`, `push-token`, `user/[username]`,
`user/[username]/follow` — which reads the header rather than the cookie:

```ts
const userId = Number(req.headers.get('x-user-id'));
```

> ### Security: `/api/app/*` trusts an unsigned header
>
> The `x-user-id` header carries no signature and is not verified against a session.
> Anyone can call these endpoints as any user:
>
> ```
> curl -H "x-user-id: 1" https://<host>/api/app/notifications
> ```
>
> That reads another account's bookmarks and notifications, follows and unfollows on
> their behalf, and registers push tokens against their account. This is the exact
> forgery the web session's HMAC was introduced to close — the mobile surface
> reintroduces it.
>
> The fix is the machinery that already exists: have the app store `userId_sig`
> alongside `userId` and send both, then run `verifyUserId` in these handlers (or
> extend `middleware.ts` to cover header-based sessions). No code has been changed —
> this is flagged for a maintainer to decide on.

Also note the Expo dependencies (`expo`, `expo-router`, `react-native`,
`expo-secure-store`, `expo-notifications`) are **absent from the root
`package.json`**, which lists only Next.js and web packages. As committed, the mobile
app will not install or run from this manifest.

---

## 9. Local setup

### Fastest path — Docker Compose

```bash
docker compose up
```

Brings up MySQL 8 on 3306 (database `silent_evidence`, named volume `db_data`),
Redis 7 on 6379 with `allkeys-lru` eviction at 128 MB, and the Next.js app on 3000.
The app waits on both health checks. Port 3306 is exposed so you can attach a GUI
client.

### Manual setup

1. **Database** — MySQL 8 or MariaDB. `provider = "mysql"` in the schema; the runtime
   uses `@prisma/adapter-mariadb`, and `lib/prisma.ts` parses `DATABASE_URL` into
   host/port/user/password/database rather than passing the string through.

2. **Environment** — create `.env`. Note: **`.env.example` is referenced by
   `lib/env.ts`'s error message but is not committed to the repo.** Required, or the
   app refuses to boot:

   ```
   DATABASE_URL=mysql://root:secret@localhost:3306/silent_evidence
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   SESSION_SECRET=<openssl rand -hex 32>
   ```

   Optional — each logs a warning naming the feature it disables:
   `ANTHROPIC_API_KEY`, `REDIS_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PREMIUM_MONTHLY_PRICE_ID`,
   `STRIPE_PREMIUM_YEARLY_PRICE_ID`, `STRIPE_AUTHOR_MONTHLY_PRICE_ID`,
   `STRIPE_AUTHOR_YEARLY_PRICE_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`.

   Not validated by `lib/env.ts` but needed for their features: `PUSHER_*`,
   `NEXT_PUBLIC_PUSHER_*`, `VAPID_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `SMTP_*`,
   `EMAIL_FROM`, `CLOUDINARY_*`, `CRON_SECRET`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`.

3. **`prisma.config.ts`** — worth understanding. It points at `prisma/schema.prisma`
   and registers the seed command, but declares the `datasource` block **only when
   `DATABASE_URL` is set**. `env()` throws on a missing variable, and `prisma generate`
   runs from `postinstall` — so without the conditional, `npm install` would fail on a
   fresh clone or in a Docker build stage that has no `.env` yet. `generate` does not
   need a database; `migrate`, `db push`, `db seed` and `studio` do.

4. **Install, migrate, seed:**

   ```bash
   npm install          # runs prisma generate via postinstall
   npm run db:migrate   # prisma migrate dev (11 migrations from the 2026-06-07 baseline)
   npm run db:seed      # categories plus sample slides
   npm run dev          # next dev --turbopack
   ```

   Additional seeds: `db:seed:categories`, `db:seed:users`, `db:seed:stories2`,
   `db:seed:demo`, and `db:grandfather-authors` for pre-paywall authors.
   Utilities: `db:studio`, `db:reset`, `db:deploy`, `typecheck`, `test`, `lint`,
   `format`.

5. **Mobile** — edit `BASE_URL` in `src/lib/api.ts` to your machine's LAN IP
   (`ipconfig`), with phone and computer on the same Wi-Fi. See the dependency caveat
   in section 8.

### Scheduled jobs

`vercel.json` defines two crons: `/api/cron/newsletter` Mondays at 09:00
(`maxDuration` 300s) and `/api/cron/publish-scheduled` every 15 minutes. Outside
Vercel you must trigger these yourself; they are guarded by `CRON_SECRET`.

---

## Known rough edges

Collected while walking the code, in rough priority order:

1. **`/api/app/*` accepts an unsigned `x-user-id` header** (section 8) — an
   authentication bypass on the mobile endpoints.
2. **Expo dependencies are missing from `package.json`** (section 8) — the mobile app
   cannot install as committed.
3. **`BASE_URL` is a hardcoded LAN IP** (section 8) — should be env-driven.
4. **`.env.example` does not exist** despite being named in the startup error
   (section 9).
5. **Two session mechanisms.** `iron-session` is a dependency and is used by ~9 newer
   routes (confessions, bingo, recipes, awards, Q&A) while everything else uses the
   HMAC cookie pair. Worth consolidating.
6. **`/admin/analytics` runs 42 per-day queries on every load** (section 7).
7. **`GET /api/Slide` is public and returns inactive slides** (section 5).
8. **`README.md` is still create-next-app boilerplate.**

---

## Where to look first

| Task | Start here |
|---|---|
| Add an API endpoint | `app/api/stories/route.ts` — Zod, session, cache, invalidate |
| Add an admin page | `app/admin/layout.tsx` for the auth shell, then any `app/admin/*/page.tsx` |
| Change the data model | `prisma/schema.prisma`, then `npm run db:migrate` |
| Touch auth | `lib/sessionCookie.ts`, `lib/session.ts`, `middleware.ts` |
| Add a homepage section | `app/page.tsx` — server/client pair plus Suspense fallback |
| Debug a cache problem | `lib/cache.ts`; unset `REDIS_URL` to bypass entirely |
