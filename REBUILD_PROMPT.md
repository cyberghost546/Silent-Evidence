# Horror Blog Website — Full Rebuild Prompt

Use this prompt to ask an AI to rebuild the "Silent Evidence" horror community platform from scratch.

---

## PROMPT (copy everything below this line)

---

Build a full-stack horror community web platform called **Silent Evidence**. This is a feature-rich blogging and community site focused on horror fiction and content. Below is the complete spec.

---

## TECH STACK

- **Framework:** Next.js (App Router, latest stable) + React
- **Database:** Prisma ORM with MariaDB (MySQL-compatible)
- **Styling:** Tailwind CSS v4
- **Auth:** Custom cookie-based sessions with iron-session + bcryptjs
- **Real-time:** Pusher (channels for DMs, reading rooms, live Q&A)
- **Payments:** Stripe (subscriptions, one-time purchases, webhooks)
- **Images:** Cloudinary (cover images, avatars, fan art)
- **AI:** Anthropic Claude API (story generation, translation, mood detection, scare scoring)
- **Email:** Nodemailer (SMTP) for transactional emails and newsletters
- **Caching:** Redis via ioredis
- **Rich Text:** TipTap editor (bold, italic, underline, headings, lists, blockquotes, horizontal rule, character count, mentions)
- **Push Notifications:** Web Push Protocol (VAPID keys)
- **Maps:** Leaflet + react-leaflet (story location map)
- **Charts:** Recharts (admin analytics)
- **Icons:** lucide-react
- **Validation:** Zod
- **Testing:** Vitest
- **Deployment:** Vercel (with vercel.json cron config)

---

## ENVIRONMENT VARIABLES REQUIRED

```
DATABASE_URL
NEXT_PUBLIC_BASE_URL
NEXT_PUBLIC_SITE_URL
ANTHROPIC_API_KEY
OLLAMA_BASE_URL (optional self-hosted AI fallback)
OLLAMA_MODEL
CRON_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PREMIUM_MONTHLY_PRICE_ID
STRIPE_PREMIUM_YEARLY_PRICE_ID
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
EMAIL_FROM
REDIS_URL
PUSHER_APP_ID
PUSHER_KEY
PUSHER_SECRET
PUSHER_CLUSTER
NEXT_PUBLIC_PUSHER_KEY
NEXT_PUBLIC_PUSHER_CLUSTER
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_MAILTO
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
MYSQL_ROOT_PASSWORD
```

---

## DATABASE SCHEMA (Prisma)

Create all of the following models in `prisma/schema.prisma`.

### Enums

```prisma
enum Role { GUEST USER AUTHOR ADMIN }
enum StoryStatus { DRAFT PUBLISHED ARCHIVED SCHEDULED }
enum NotificationType { COMMENT REPLY LIKE FOLLOW MENTION COLLABORATE DIRECT_MESSAGE GROUP_INVITE }
enum GroupRole { MEMBER MODERATOR OWNER }
enum ReactionType { LOVE SCARED GHOST FIRE }
enum Mood { EPIC HEARTWARMING MYSTERIOUS ACTION ROMANTIC COMEDIC DRAMATIC DARK }
enum ReportType { COMMENT STORY FORUM_POST FORUM_REPLY }
enum ReportReason { HARASSMENT HATE_SPEECH SPAM INAPPROPRIATE THREATS OTHER }
enum ReportStatus { PENDING REVIEWED DISMISSED }
enum AgeGroup { UNDER_13 TEEN ADULT }
enum ContentRating { ALL TEEN MATURE }
```

### Core Models

**User** — central model with 60+ relations:
- id, email (unique), username (unique), password (bcrypt hash)
- role (default USER), emailVerified (bool), isVerified (blue checkmark), isPrivate
- pinnedStoryId (optional), dateOfBirth (optional DateTime), ageGroup
- profileTheme (hex color string), avatarBorder (cosmetic string)
- readingSpeed (int, words per minute), twoFactorEnabled (bool), onboardingDone (bool)
- createdAt, updatedAt
- Relations: Profile, stories, likes, comments, bookmarks, reactions, notifications, badges, follows (both directions), blockedBy, blocked, reports, warnings, auditLogs, loginLogs, messagesSent, messagesReceived, subscription, tips, storyPurchases, bundlePurchases, chapterPurchases, groupsOwned, groupMemberships, squadsOwned, squadMemberships, readingHistory, readingGoal, writingStreak, readingStreak, pushSubscriptions, writingSprints (SprintParticipant), tagFollows, sequelRequests, fanArt, betaReaderInvites, coauthorRequests, storyCollaborators, quizAttempts, lastWords, chainStorySegments, screamNominations, screamVotes, AuthorQA

**Profile** — one-to-one with User:
- id, userId (unique), bio, avatar (Cloudinary URL), website, location
- fearMoods (String array — favorite horror moods), merchUrl
- twitterHandle, instagramHandle
- createdAt, updatedAt

**Story** — main content model:
- id, title, slug (unique), content (LongText), excerpt
- coverImage (Cloudinary URL), status (default DRAFT)
- authorId → User, categoryId → Category, seriesId → Series (optional), seriesOrder (optional Int)
- mood (Mood enum), contentRating (default ALL), scareScore (Float, AI-computed), scareReason (String)
- views (Int default 0), featured (bool), language (String default "en")
- isChaptered (bool), audioUrl, videoUrl, spotifyPlaylistUrl
- price (Int cents, optional), isPremiumOnly (bool), earlyAccessUntil (DateTime optional)
- tipGoalAmount (Int cents optional), tipGoalTitle, tipGoalDescription
- deathCount (Int), creepyOfMonth (bool), locationName, latitude (Float), longitude (Float)
- scheduledAt (DateTime optional)
- publishedAt (DateTime optional)
- createdAt, updatedAt
- Relations: author, category, tags (StoryTag), likes, comments, reactions, bookmarks, chapters, scareRatings, readingHistory, storyLists, purchases, bundleItems, collaborators, planner, milestones, presence, draftShareTokens, sequelRequests, fanArt, betaReaderInvites, coauthorRequests, authorQAs, branchNodes, lastWords, chainStories, monsterLinks

**Category** — story categories (Paranormal, True Stories, Supernatural, Psychological, Slasher, etc.):
- id, name (unique), slug (unique), description, icon (optional emoji)
- createdAt

**Tag** — story tags (forest, possessed, haunted, etc.):
- id, name (unique), slug (unique)

**StoryTag** — join table: storyId + tagId

### Engagement Models

**Like** — unique(userId, storyId): id, userId, storyId, createdAt

**Reaction** — emoji reaction: id, userId, storyId, type (ReactionType), createdAt. unique(userId, storyId, type)

**Bookmark** — id, userId, storyId, createdAt. unique(userId, storyId)

**Comment** — id, userId, storyId, content (text), parentId (self-relation for nested replies), isPinned (bool), createdAt, updatedAt. Relations: user, story, parent, replies, reactions, reports

**CommentReaction** — id, userId, commentId, type (ReactionType). unique(userId, commentId, type)

**ScareRating** — crowd-sourced scare score: id, userId, storyId, rating (Int 1-5), createdAt. unique(userId, storyId)

**ReadingHistory** — id, userId, storyId, createdAt, updatedAt. unique(userId, storyId) — upserted on each story visit

**TagFollow** — id, userId, tagId, createdAt. unique(userId, tagId)

### Content Creation

**Series** — id, title, slug (unique), description, authorId, createdAt. Relations: author, stories

**StoryChapter** — id, storyId, title, content (LongText), order (Int), price (Int cents optional), publishedAt, createdAt. Relations: story, purchases

**StoryList** — user-curated lists: id, userId, title, description, isPublic (bool), createdAt. Relations: user, items

**StoryListItem** — id, listId, storyId, order (Int), createdAt. unique(listId, storyId)

**StoryPlanner** — author notes/outline: id, storyId (unique), data (JSON), createdAt, updatedAt

**DraftShareToken** — id, storyId, token (unique nanoid), expiresAt, createdAt. Relations: story

### Monetization

**Subscription** — id, userId (unique), stripeCustomerId, stripeSubscriptionId, plan (MONTHLY/YEARLY), status (ACTIVE/CANCELED/PAST_DUE), currentPeriodEnd (DateTime), createdAt, updatedAt

**Tip** — id, senderId, recipientId, storyId (optional), amount (Int cents), message (optional), stripePaymentIntentId, createdAt

**StoryPurchase** — id, userId, storyId, amount (Int cents), createdAt. unique(userId, storyId)

**StoryBundle** — id, slug (unique), title, description, coverImage, price (Int cents), createdAt. Relations: items, purchases

**StoryBundleItem** — id, bundleId, storyId. unique(bundleId, storyId)

**BundlePurchase** — id, userId, bundleId, createdAt. unique(userId, bundleId)

**ChapterPurchase** — id, userId, chapterId, createdAt. unique(userId, chapterId)

### Community & Moderation

**Follow** — id, followerId, followingId, createdAt. unique(followerId, followingId)

**BlockedUser** — id, blockerId, blockedId, createdAt. unique(blockerId, blockedId)

**Report** — id, reporterId, type (ReportType), reason (ReportReason), targetId (storyId or commentId or postId), status (default PENDING), notes (admin notes), reviewedBy (admin userId optional), createdAt, updatedAt

**ContactMessage** — id, name, email, subject, message, isRead (bool), createdAt

**UserWarning** — id, userId, adminId, reason, createdAt

**AuditLog** — id, adminId, action (String), targetType, targetId, details (JSON optional), createdAt

**LoginLog** — id, userId, ip, userAgent, country, city, success (bool), createdAt

**BannedWord** — id, word (unique), createdAt

**UserBadge** — id, userId, badge (String — e.g. FIRST_STORY, TEN_LIKES, STREAK_7, etc.), awardedAt

### Community Features

**Forum** — id, slug (unique), title, description, icon, isPublic (bool), createdAt. Relations: posts

**ForumPost** — id, forumId, authorId, title, content, isPinned, createdAt, updatedAt. Relations: forum, author, replies, reports

**ForumReply** — id, postId, authorId, content, parentId (self-relation), createdAt, updatedAt

**Group** — id, slug (unique), name, description, coverImage, isPublic, ownerId, createdAt. Relations: owner, members, posts

**GroupMember** — id, groupId, userId, role (GroupRole default MEMBER), joinedAt. unique(groupId, userId)

**GroupPost** — id, groupId, authorId, content, createdAt, updatedAt

**Squad** — small private groups: id, slug (unique), name, description, ownerId, createdAt. Relations: owner, members, posts

**SquadMember** — id, squadId, userId, joinedAt. unique(squadId, userId)

**SquadPost** — id, squadId, authorId, content, createdAt, updatedAt

**Poll** — id, creatorId, groupId (optional), question, endsAt (DateTime), createdAt. Relations: options

**PollOption** — id, pollId, text, votes (PollVote[])

**PollVote** — id, pollId, optionId, userId, createdAt. unique(pollId, userId)

**DirectMessage** — id, senderId, receiverId, content, isRead (bool), createdAt

**Notification** — id, userId, type (NotificationType), fromUserId (optional), storyId (optional), commentId (optional), message (optional), isRead (bool default false), createdAt

### Reading Experience

**ReadingRoom** — real-time shared reading: id, storyId, hostId, isActive, createdAt. Relations: members

**ReadingRoomMember** — id, roomId, userId, scrollPosition (Float 0-100), joinedAt. unique(roomId, userId)

**StoryPresence** — live reader count: id, storyId (unique), readerCount (Int), lastUpdated (DateTime)

### Gamification & Challenges

**Challenge** — id, title, description, prompt, startDate, endDate, isActive, prize (optional), createdAt. Relations: entries

**ChallengeEntry** — id, challengeId, authorId, storyId, submittedAt, votes (Int default 0). unique(challengeId, storyId)

**StoryBattle** — two stories compete: id, storyAId, storyBId, startDate, endDate, isActive, winnerId (optional), createdAt. Relations: votes

**BattleVote** — id, battleId, userId, storyId (the one they voted for), createdAt. unique(battleId, userId)

**StoryDare** — id, challengerId, targetId, storyId, message, isCompleted, completedAt, createdAt

**Villain** — id, name, description, image, weekStart (DateTime), weekEnd (DateTime), createdAt. Relations: votes

**VillainVote** — id, villainId, userId, createdAt. unique(villainId, userId)

**QuizAttempt** — id, userId, quizId (String), score (Int), total (Int), createdAt

**WritingStreak** — id, userId (unique), currentStreak (Int), longestStreak (Int), lastPublishedAt (DateTime), updatedAt

**ReadingStreak** — id, userId (unique), currentStreak (Int), longestStreak (Int), lastReadAt (DateTime), updatedAt

**ReadingGoal** — id, userId (unique), targetStories (Int), year (Int), month (Int optional), completedCount (Int default 0), updatedAt

**WritingSprint** — id, title, hostId, durationMinutes (Int), startedAt (DateTime), endedAt (DateTime optional), wordGoal (Int), createdAt. Relations: participants

**SprintParticipant** — id, sprintId, userId, wordsWritten (Int default 0), joinedAt. unique(sprintId, userId)

**ScreamAward** — yearly awards: id, year (Int unique), title, description, isOpen (bool), createdAt. Relations: categories

**ScreamAwardCategory** — id, awardId, name, description. Relations: nominations

**ScreamNomination** — id, categoryId, nominatorId, storyId, createdAt. unique(categoryId, storyId)

**ScreamVote** — id, categoryId, voterId, storyId, createdAt. unique(categoryId, voterId)

### Interactive Content

**BingoTemplate** — horror trope bingo card template: id, title, cells (JSON array of 25 cell texts), createdAt

**BingoCard** — user's bingo card: id, templateId, userId, createdAt. Relations: checks

**BingoCellCheck** — id, cardId, cellIndex (Int), checkedAt. unique(cardId, cellIndex)

**Monster** — encyclopedia entry: id, name, slug (unique), description, image, origin, abilities (JSON array), weaknesses (JSON array), createdAt. Relations: storyLinks

**MonsterStoryLink** — id, monsterId, storyId. unique(monsterId, storyId)

**HorrorRecipe** — id, title, slug (unique), description, ingredients (JSON), steps (JSON), image, authorId, createdAt. Relations: reactions

**RecipeReaction** — id, recipeId, userId, emoji (String), createdAt. unique(recipeId, userId)

**LastWord** — micro-horror (max 280 chars): id, authorId, content (max 280), likes (LastWordLike[]), createdAt

**LastWordLike** — id, lastWordId, userId, createdAt. unique(lastWordId, userId)

**ChainStory** — collaborative sequential stories: id, title, prompt, isOpen (bool), createdAt. Relations: segments

**ChainStorySegment** — id, chainStoryId, authorId, content, order (Int), createdAt

**BranchNode** — choose-your-own-horror: id, storyId, parentId (self-relation), prompt, content, createdAt

**BookClub** — id, name, slug (unique), description, currentStoryId (optional), ownerId, createdAt. Relations: members

**BookClubMember** — id, clubId, userId, joinedAt. unique(clubId, userId)

**AuthorQA** — id, storyId, authorId, askerId (optional for anonymous), question, answer (optional), isAnonymous (bool), answeredAt, createdAt

**SequelRequest** — id, storyId, requesterId, message (optional), votes (Int default 0), createdAt

**FanArt** — id, storyId, artistId, imageUrl, caption, createdAt

**BetaReaderInvite** — id, storyId, authorId, inviteeId (optional), inviteEmail (optional), token (unique nanoid), feedback (optional text), acceptedAt, createdAt

**CoauthorRequest** — id, storyId, requesterId, targetId (optional), note (optional), status (PENDING/ACCEPTED/DECLINED), createdAt

**StoryCollaborator** — id, storyId, userId, role (String), joinedAt. unique(storyId, userId)

### Notifications & Email

**PushSubscription** — id, userId, endpoint (unique), keys (JSON — p256dh + auth), createdAt

**EmailLog** — id, to, subject, template, status (SENT/FAILED), createdAt

**EmailVerificationToken** — id, userId, token (unique), expiresAt, createdAt

**PasswordResetToken** — id, userId, token (unique), expiresAt, used (bool), createdAt

**TwoFactorCode** — id, userId, code (6-digit string), expiresAt, createdAt

**Confession** — anonymous horror confessions: id, authorId (optional), content, isAnonymous (bool), createdAt. Relations: reactions

**ConfessionReaction** — id, confessionId, userId, emoji (String), createdAt. unique(confessionId, userId)

### Admin & Settings

**SiteSetting** — id, key (unique String), value (text), updatedAt

**CookieConsent** — id, userId (optional), ip, accepted (bool), createdAt

**Slide** — homepage carousel: id, title, subtitle, imageUrl, linkUrl, order (Int), isActive, createdAt

**CalendarEvent** — id, title, description, date (DateTime), createdAt

**WritingPrompt** — id, prompt (text), weekStart (DateTime), isActive, createdAt. Relations: entries

**PromptEntry** — id, promptId, storyId, authorId, submittedAt

**MoodOfDay** — id, mood (Mood enum), message (text), date (DateTime unique), createdAt

**LiveQASession** — id, authorId, title, startedAt, endedAt (optional), isActive, createdAt. Relations: questions

**LiveQAQuestion** — id, sessionId, askerId, question, answer (optional), isAnswered, answeredAt, createdAt

---

## FOLDER STRUCTURE

Follow Next.js App Router conventions:

```
app/
  layout.tsx                    # Root layout with fonts, metadata, Header, Footer
  page.tsx                      # Homepage
  not-found.tsx                 # 404 page
  globals.css                   # Tailwind + custom CSS variables & animations

  # Auth
  login/page.tsx
  register/page.tsx
  forgot-password/page.tsx
  reset-password/page.tsx
  verify-age/page.tsx           # Age gate for MATURE content
  apply-for-verification/page.tsx  # Request blue checkmark

  # Content browsing
  story/[slug]/page.tsx         # Story reader page (SSR with OG meta)
  category/[slug]/page.tsx      # Browse by category
  tag/[slug]/page.tsx           # Browse by tag
  mood/page.tsx                 # Browse by mood
  mood/[mood]/page.tsx          # Stories for specific mood
  trending/page.tsx
  discover/page.tsx
  search/page.tsx

  # User content
  write/page.tsx                # Story creation form
  write/sprints/page.tsx        # Writing sprints
  my-stories/page.tsx
  my-invites/page.tsx           # Beta reader & co-author invites
  bookmarks/page.tsx
  history/page.tsx              # Reading history
  offline-reads/page.tsx        # PWA offline saved stories

  # User profile & social
  profile/[username]/page.tsx
  dashboard/page.tsx
  settings/page.tsx
  feed/page.tsx                 # Following feed
  for-you/page.tsx              # AI-personalized feed
  following/page.tsx
  activity/page.tsx
  leaderboard/page.tsx
  awards/page.tsx               # Scream Awards

  # Story organization
  series/[slug]/page.tsx
  series/new/page.tsx
  list/[id]/page.tsx
  lists/page.tsx

  # Community
  messages/page.tsx             # Inbox
  messages/[username]/page.tsx  # DM conversation
  forums/[slug]/page.tsx
  groups/[slug]/page.tsx
  squads/page.tsx
  book-club/page.tsx
  book-club/[id]/page.tsx

  # Interactive/gamification
  challenges/[id]/page.tsx
  dares/page.tsx
  bingo/page.tsx
  polls/page.tsx
  confessions/page.tsx
  quiz/page.tsx
  monsters/page.tsx
  monsters/[slug]/page.tsx
  recipes/page.tsx
  recipes/[slug]/page.tsx
  map/page.tsx                  # Leaflet story location map

  # Premium/monetization
  premium/page.tsx
  premium/success/page.tsx
  bundles/page.tsx
  bundles/[slug]/page.tsx

  # PWA & static
  offline/page.tsx
  install/page.tsx
  about/page.tsx
  contact/page.tsx
  privacy/page.tsx
  terms/page.tsx
  widget/page.tsx               # Embeddable widget

  # Reading games & tools
  reading-challenge/page.tsx
  story-of-day/page.tsx
  polls/page.tsx
  coauthor/page.tsx             # Co-author board

  components/ui/                # ~177 client/server components (see below)

  api/                          # ~80 API route handlers (see below)

  admin/                        # Admin panel (requires ADMIN role)
    layout.tsx                  # Admin sidebar layout
    page.tsx                    # Dashboard overview
    analytics/page.tsx
    audit-log/page.tsx
    banned-words/page.tsx
    categories/page.tsx
    challenges/page.tsx
    challenges/new/page.tsx
    comments/page.tsx
    contact/page.tsx
    cookies/page.tsx
    digest/page.tsx
    email-log/page.tsx
    email-templates/page.tsx
    featured-authors/page.tsx
    generate/page.tsx           # Batch AI story generation
    health/page.tsx             # System health check
    heatmap/page.tsx
    ip-blocklist/page.tsx
    login-logs/page.tsx
    login-map/page.tsx
    merge/page.tsx              # Merge duplicate tags/categories
    mood/page.tsx
    newsletter/page.tsx
    polls/page.tsx
    premium/page.tsx
    prompts/page.tsx
    rate-limits/page.tsx
    reports/page.tsx
    revenue/page.tsx
    scheduled/page.tsx          # Scheduled story queue
    search/page.tsx
    seo/page.tsx
    settings/page.tsx
    slides/page.tsx
    spotlight/page.tsx
    stories/page.tsx
    story-of-week/page.tsx
    tags/page.tsx
    toxicity/page.tsx
    users/page.tsx
    user-support/page.tsx
    verification/page.tsx
    warnings/page.tsx

lib/
  prisma.ts                     # Prisma client singleton
  session.ts                    # getSessionUserId, getSessionUser, requireAuth, requireAdmin
  apiError.ts                   # Standardized API error responses
  rateLimit.ts                  # Redis-based rate limiter
  sanitize.ts                   # sanitize-html XSS prevention
  email.ts / mailer.ts          # Nodemailer send helpers
  csrf.ts / getCsrfToken.ts     # CSRF token generation/validation
  badges.ts                     # Badge award logic
  cache.ts                      # Redis get/set/del helpers
  readingLimit.ts               # Paywall / reading limit logic
  readingTime.ts                # Estimate reading time from word count
  moodDetect.ts                 # Claude API mood classification
  toxicityCheck.ts              # Claude API content moderation
  premiumCheck.ts               # Check user subscription status
  storyTemplates.ts             # Horror story writing templates
  streaks.ts                    # Writing/reading streak calculations
  pusher.ts                     # Server-side Pusher client
  pusher-client.ts              # Client-side Pusher singleton
  webpush.ts                    # Web push notification sender
  sendNewsletter.ts             # Weekly newsletter composer
  sendCommentsDigest.ts         # Comments digest composer
  cloudinary.ts                 # Cloudinary upload helper
  geoip.ts                      # IP-to-location lookup
  languages.ts                  # Supported language list

middleware.ts                   # Edge auth guard for /admin/* routes
prisma/schema.prisma            # All models defined above
docker-compose.yml              # MariaDB local dev
vercel.json                     # Cron job config
```

---

## UI COMPONENTS (app/components/ui/)

Build all components as React client or server components. Key ones:

**Layout:**
- `Header.tsx` — site nav, search bar, notification bell, user menu
- `Footer.tsx` — links, newsletter signup
- `AdminSidebar.tsx` — collapsible admin nav with 40+ links

**Story Creation:**
- `StoryForm.tsx` — full story creation/edit form with:
  - TipTap `RichEditor.tsx` for content
  - Autosave to localStorage every 30 seconds
  - Title, excerpt, category dropdown, tag picker
  - Mood selector (8 moods), content rating (ALL/TEEN/MATURE)
  - Content warnings multi-select
  - Cover image upload (Cloudinary) or URL
  - Video URL, audio URL, Spotify playlist URL
  - Series selection + order
  - Scheduled publish datetime picker
  - Location picker (lat/lng + location name)
  - Death count input
  - Premium-only toggle + early access window
  - Tip goal setup
  - Language selector
  - Story templates picker
  - AI writing assistant sidebar
  - Status toggle (DRAFT/PUBLISHED)
  - POST to `/api/stories`
- `AIWritingAssistant.tsx` — call Claude to generate/suggest story text
- `ChapterManager.tsx` — add/reorder/price chapters

**Story Reading:**
- `StoryInteractions.tsx` — like button, bookmark, share, report, comment section
- `ReactionBar.tsx` — LOVE/SCARED/GHOST/FIRE emoji reactions with counts
- `ScareOMeter.tsx` — display AI scare score + crowd scare ratings
- `CommentSection.tsx` — nested threaded comments with reactions, pin, delete
- `ReadAloudButton.tsx` — text-to-speech playback
- `TypewriterMode.tsx` — cinematic reading mode
- `AudioPlayer.tsx` — plays story audio narration
- `VideoEmbed.tsx` — embedded YouTube/Vimeo
- `SeriesNav.tsx` — prev/next chapter navigation
- `TipGoalWidget.tsx` — fundraising progress bar + tip button
- `StoryMilestones.tsx` — achievement milestones (100 reads, 50 likes, etc.)
- `ReadingProgress.tsx` — sticky reading progress bar at top
- `SpoilerText.tsx` — blur-to-reveal spoiler component
- `TranslateStory.tsx` — translate story via Claude API
- `AgeGate.tsx` — modal for MATURE content requiring DOB verification

**Discovery & Feeds:**
- `PopularStories.tsx` — trending story cards
- `StoryCard.tsx` — story preview card (cover, title, author, tags, scare score)
- `MoodFilter.tsx` — filter by mood chips
- `TrendingTags.tsx` — tag cloud
- `RelatedTagsSidebar.tsx` — related tags in story sidebar

**User & Social:**
- `FollowButton.tsx` — follow/unfollow with optimistic UI
- `FollowListModal.tsx` — followers/following list modal
- `ProfileStoriesGrid.tsx` — masonry grid of user's stories
- `BookmarkButton.tsx` — bookmark with optimistic toggle
- `ShareButton.tsx` — native share API + copy link
- `DareAFriend.tsx` — send story dare to friend
- `DaresInbox.tsx` — received dares list

**Gamification:**
- `WritingStreakBadge.tsx` — flame icon + streak count
- `ReadingStreakBadge.tsx` — streak count for reading
- `ReadingBadge.tsx` — achievement badge display
- `WordCountBadge.tsx` — total words written
- `ReadingGoalWidget.tsx` — reading goal progress ring
- `WritingSprintTimer.tsx` — countdown timer for sprints
- `ChallengeCountdown.tsx` — challenge deadline countdown
- `ScareOMeter.tsx` — scare score display

**Community:**
- `ForumReplyForm.tsx` — reply to forum post
- `ForumReportButton.tsx` — report forum content
- `ForumsDropdown.tsx` — forum quick-nav dropdown
- `PollCard.tsx` — vote on poll with percentage bars
- `NewPostForm.tsx` — create group/squad post
- `NewChallengeForm.tsx` — create writing challenge (admin)

**Premium & Payments:**
- `PremiumBadge.tsx` — "PREMIUM" pill badge
- `BundlePurchaseButton.tsx` — Stripe checkout for bundles
- `TipButton.tsx` — tip author via Stripe
- `AddToListButton.tsx` — add story to reading list

**Creator Tools:**
- `StoryAnalytics.tsx` / `StoryAnalyticsPanel.tsx` — views, likes, comments over time (Recharts)
- `DraftSharePanel.tsx` — generate share token for beta readers
- `CoAuthorInvite.tsx` — invite collaborator

**Admin:**
- `AdminStoriesClient.tsx` — story management table with actions
- `AdminCommentsClient.tsx` — comment moderation table
- `AdminOverviewChart.tsx` — Recharts dashboard charts
- `AdminDigestClient.tsx`, `AdminNewsletterClient.tsx`, `AdminPromptsClient.tsx`, `AdminReportsClient.tsx`
- `BatchClient.tsx` — batch AI story generation UI

**Misc UI:**
- `AnnouncementBanner.tsx` — dismissible site-wide banner (from SiteSetting)
- `ThemeToggle.tsx` — light/dark mode toggle
- `PushNotificationToggle.tsx` — enable/disable browser push
- `ServiceWorkerRegistration.tsx` — register PWA service worker
- `ReadingTracker.tsx` — invisible component tracking reading progress
- `CurrentlyReadingBadge.tsx` — shown on profile if reading a story
- `AdBanner.tsx` — placeholder ad unit
- `Skeleton.tsx` — loading skeleton components
- `GhostMode.tsx` — anonymous reading (no history tracked)
- `ReaderPulse.tsx` — live pulse showing other readers on story
- `VerifiedBadge.tsx` — blue checkmark for verified authors
- `DiscordConnect.tsx` — link Discord account

---

## API ROUTES (app/api/)

### Auth (`/api/auth/`)
- `POST /login` — validate email+password, rate limit, set `userId` cookie, or send 2FA
- `POST /logout` — clear cookie
- `POST /register` — hash password, create user+profile, send verification email
- `GET /verify-email?token=` — mark emailVerified, delete token
- `POST /2fa-send` — generate 6-digit code, email it, store with 10-min expiry
- `POST /2fa-verify` — validate code, set session cookie
- `POST /password-reset` — generate PasswordResetToken, send email
- `POST /reset-password` — validate token, update password, mark used
- `GET /oauth/google` — Google OAuth callback → find/create user → set cookie
- `GET /oauth/microsoft` — Microsoft OAuth callback → same flow

### Stories (`/api/stories/`)
- `GET /` — paginated list, filter by status/category/mood/tag/search, include author+tags
- `POST /` — create story (auth required, sanitize content, compute reading time, auto-slug from title)
- `GET /trending` — top stories by views in last 7 days
- `GET /for-you` — personalized feed based on user's reading history and tag follows
- `POST /cover` — upload cover image to Cloudinary, return URL
- `GET /presence` — return live reader counts for given story IDs
- `GET /[id]/analytics` — author-only: views over time, likes, comments, tips
- `GET /[id]/recommendations` — similar stories by tag/mood/category
- `GET /[id]/planner` — get planner JSON (author only)
- `PUT /[id]/planner` — save planner JSON
- `POST /[id]/export` — export story as PDF or DOCX
- `GET /[id]/milestones` — return milestone achievements for story

### Engagement
- `POST /api/likes` — like story; `DELETE /api/likes/[id]` — unlike
- `POST /api/reactions` — add emoji reaction; `DELETE /api/reactions/[id]` — remove
- `POST /api/bookmarks` — bookmark; `DELETE /api/bookmarks/[id]` — remove
- `POST /api/comments` — create comment (supports parentId for replies)
- `PUT /api/comments/[id]` — edit comment (owner only)
- `DELETE /api/comments/[id]` — delete (owner or admin)
- `POST /api/scare-rating` — upsert scare rating (1-5) for story

### Users & Social
- `GET /api/user` — current user profile+stats
- `PUT /api/user` — update profile fields
- `GET /api/users?q=` — search users
- `GET /api/users/[id]` — public profile
- `POST /api/follows` — follow user; `DELETE /api/follows/[id]` — unfollow
- `GET /api/following` — list who current user follows
- `GET /api/followers` — list current user's followers

### Community
- `GET /api/forums` — list forums; `POST /api/forums` — create (admin)
- `POST /api/forum-posts` — create post; `GET /api/forum-posts/[id]` — get post with replies
- `GET /api/groups` — list groups; `POST /api/groups` — create group
- `GET /api/squads` — list squads; `POST /api/squads` — create squad
- `GET /api/messages?with=username` — DM conversation; `POST /api/messages` — send DM
- `POST /api/poll` — create poll; `POST /api/poll-vote` — vote
- `GET /api/notifications` — user's notification list
- `POST /api/notifications/read` — mark all read

### Payments
- `POST /api/stripe/create-checkout` — create Stripe checkout session (bundle or subscription)
- `POST /api/stripe/webhook` — handle Stripe events (subscription created/updated/deleted, payment succeeded)
- `POST /api/tips` — send tip (Stripe Payment Intent)
- `GET /api/tips` — tip leaderboard

### AI
- `POST /api/ai/generate` — generate story with Claude (or Ollama fallback), stream response
- `POST /api/ai/translate` — translate story to target language
- `POST /api/ai/detect-mood` — classify story mood
- `POST /api/ai/rate-scare` — compute scare score 1-10

### Upload & Media
- `POST /api/upload` — upload image file → Cloudinary → return URL
- `POST /api/upload/avatar` — avatar upload
- `POST /api/upload/cover` — story cover upload

### Push Notifications
- `POST /api/push/subscribe` — save PushSubscription to DB
- `POST /api/push/notify` — send Web Push to user (admin/system use)

### Real-time
- `POST /api/pusher/auth` — authenticate private Pusher channel
- `POST /api/stories/presence` — update live reader count for story

### Admin (`/api/admin/`)
- `GET /analytics` — dashboard stats (total users, stories, revenue, views)
- `GET /users` — all users with filters (role, banned, search)
- `PUT /users/[id]` — update role, ban/unban
- `POST /users/[id]/warn` — issue warning
- `GET /stories` — all stories with filters
- `DELETE /stories/[id]` — delete story
- `PUT /stories/[id]/feature` — feature/unfeature
- `GET /comments` — all comments
- `DELETE /comments/[id]` — remove comment
- `GET /reports` — pending reports list
- `PUT /reports/[id]` — mark reviewed/dismissed
- `GET /audit-log` — admin action history
- `GET /settings` — all site settings
- `PUT /settings/[key]` — update setting value

### Cron (`/api/cron/`) — all protected by CRON_SECRET header
- `POST /publish-scheduled` — find SCHEDULED stories past scheduledAt, set PUBLISHED
- `POST /newsletter` — compose and send weekly newsletter
- `POST /comments-digest` — send comments digest emails
- `POST /leaderboard` — recalculate leaderboard rankings
- `POST /check-streaks` — update reading/writing streaks

### Other
- `POST /api/contact` — save ContactMessage, send email notification
- `POST /api/cookie-consent` — log GDPR consent
- `GET /api/og` — generate Open Graph image via @vercel/og
- `GET /api/search?q=` — full-text search stories, tags, users
- `POST /api/csrf` — generate CSRF token

---

## MIDDLEWARE

`middleware.ts` at root:
- Runs on edge runtime
- Matches `/admin/:path*`
- Reads `userId` cookie — if missing, redirect to `/login?from=/admin/...`
- Does NOT query DB (edge-compatible)

---

## AUTH SESSION

`lib/session.ts`:
```ts
// Read userId cookie → return userId string or null
export async function getSessionUserId(): Promise<string | null>

// Fetch full User from DB or null
export async function getSessionUser(): Promise<User | null>

// Throw 401 ApiError if not logged in
export async function requireAuth(): Promise<User>

// Throw 403 ApiError if not ADMIN role
export async function requireAdmin(): Promise<User>
```

Cookie name: `userId`, HttpOnly, SameSite=Lax, Secure in production.

---

## STYLING GUIDELINES

- Tailwind CSS v4, dark-mode-first design
- Primary palette: dark backgrounds (slate-950/gray-950), red accents (#dc2626 blood red), purple highlights
- Fonts: Geist Sans (body), Geist Mono (code/mono)
- Smooth scroll, no tap highlight on mobile
- Text selection: blood-red highlight in dark mode
- Notification toast slide-in animation
- PWA safe area insets for iPhone notch
- Avatar CSS animations: spin, flicker, pulse variants
- Responsive: mobile-first, breakpoints sm/md/lg/xl/2xl

---

## KEY FEATURES TO IMPLEMENT (in priority order)

1. **User auth** — register, login, cookie session, email verify, password reset, 2FA, OAuth (Google/Microsoft)
2. **Story CRUD** — create, edit, publish, draft, schedule; rich text editor; cover upload; tags/categories
3. **Story reading page** — SSR, OG meta, view counter, reading time, series nav
4. **Engagement** — likes, emoji reactions, comments (nested), bookmarks
5. **User profiles** — bio, avatar, stats, pinned story, follow/unfollow
6. **Content moderation** — age gate, content ratings, banned words, report system
7. **Admin panel** — dashboard, user/story/comment management, settings
8. **Search** — full-text search for stories/users/tags
9. **Discovery feeds** — trending, for-you, category/tag/mood browse
10. **Premium + payments** — Stripe subscriptions, story purchases, bundles, tips
11. **Community** — forums, groups, squads, DMs (real-time with Pusher)
12. **AI features** — story generation (Claude), mood detection, scare scoring, translation
13. **Gamification** — streaks, badges, challenges, bingo, battles, scream awards
14. **Creator tools** — analytics, series, co-authors, beta readers, story planner
15. **Real-time** — reading rooms, live reader count, live Q&A
16. **Email** — transactional (verify/reset/2FA) + newsletter + digest
17. **Push notifications** — Web Push for comments/likes/follows
18. **PWA** — service worker, offline reading, install prompt
19. **Maps** — Leaflet story location map
20. **Interactive content** — bingo, monster encyclopedia, horror recipes, chain stories, confessions

---

## SECURITY REQUIREMENTS

- Sanitize all HTML content with sanitize-html before storage and rendering
- CSRF protection on all state-changing API routes
- Rate limiting on login (Redis sliding window — 5 attempts per 15 minutes per IP)
- Rate limiting on AI endpoints (Claude API cost control)
- Middleware edge-level admin route protection
- bcrypt password hashing (rounds: 12)
- HttpOnly cookies for session
- Input validation with Zod on all API routes
- SQL injection prevention via Prisma parameterized queries
- XSS prevention via sanitize-html + React's built-in escaping
- Content rating age verification stored in cookie after DOB check

---

## VERCEL CRON CONFIG (vercel.json)

```json
{
  "crons": [
    { "path": "/api/cron/publish-scheduled", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/newsletter", "schedule": "0 9 * * 1" },
    { "path": "/api/cron/comments-digest", "schedule": "0 8 * * *" },
    { "path": "/api/cron/leaderboard", "schedule": "0 0 * * *" },
    { "path": "/api/cron/check-streaks", "schedule": "0 1 * * *" }
  ]
}
```

All cron routes validate `Authorization: Bearer <CRON_SECRET>` header.

---

## DOCKER (local dev)

`docker-compose.yml`:
```yaml
services:
  db:
    image: mariadb:11
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: silent_evidence
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
volumes:
  db_data:
```

---

Start by scaffolding the Next.js app with Prisma, then implement features in the priority order listed above. Build API routes before their corresponding UI components. Use server components for SSR pages and client components only where interactivity is required.
