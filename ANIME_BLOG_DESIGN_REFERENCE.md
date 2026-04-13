# Anime Blog Design Reference

This project's UI can be reused as a strong base for `anime-blog`.

## Core Layout Pattern

- Dark-first app shell with optional light mode override.
- Sticky top header, long scrolling homepage, dense section stacking.
- Main content width is consistently constrained with `max-w-6xl mx-auto px-4`.
- Homepage flow is:
  1. Header
  2. Writing/announcement strip
  3. Full-width hero slideshow
  4. Featured content sections stacked vertically
  5. A two-column content band:
     - primary feed on the left
     - utility/sidebar cards on the right
  6. Footer
- Sections are separated with generous vertical rhythm, usually `py-12` to `py-14`.

## Visual Style

- Base background: `bg-gray-900` with darker surfaces like `bg-gray-800` and `bg-gray-950`.
- Main text: white headings with muted gray metadata.
- Accent system:
  - primary accent in the current project is green in branding/header actions
  - editorial/feature accent is often red for hero buttons, title bars, hovers, and glow effects
  - some sections use contextual accent colors like orange for trending
- Cards use:
  - rounded corners (`rounded-xl` or `rounded-2xl`)
  - dark borders (`border-gray-700` / `border-gray-800`)
  - subtle glow shadows
  - stronger colored border/shadow on hover
- Imagery is important:
  - large cover art
  - dark overlays over images
  - text anchored at the bottom of hero images

## Reusable Homepage Formula

- Hero slideshow:
  - full width
  - around `h-[520px]`
  - image background with black gradient overlay
  - strong headline, short supporting copy, one clear CTA
- Featured section:
  - left side large hero card
  - right side stacked compact cards
- Category grid:
  - icon-based cards
  - colorful accents per item
  - compact labels and counts
- Feed section:
  - recent/latest content as the main column
  - trending / leaderboard / calendar-type widgets in sidebar
- Footer:
  - 4-column information layout
  - brand block + navigation + categories + account/legal

## Navigation Pattern

- Desktop header:
  - logo on the left
  - short nav row
  - search in the middle/right
  - user actions on the far right
- Mobile:
  - hamburger menu
  - dropdown sheet under the sticky header
  - expandable categories inside the mobile menu
- Good reusable rule for `anime-blog`:
  - keep the exact structure
  - swap forum/challenge/map items for anime-specific destinations like `Reviews`, `Seasonal`, `Characters`, `Watchlists`

## Typography and UI Language

- Clean modern sans font via Next font loading.
- Big bold section titles.
- Small uppercase labels for metadata and category pills.
- Interface tone is community-driven and editorial, not minimalist.
- Many sections begin with a small vertical accent bar plus heading.

## Theme System

- Root layout defaults to dark mode.
- `ThemeToggle` switches `html.dark` / `html.light`.
- Light mode is not a separate redesign; it is a systematic variable remap.
- Important detail:
  - the project remaps Tailwind color variables in `app/globals.css`
  - dark surfaces become white/light gray
  - red accents are remapped to blue in light mode
- This means a future `anime-blog` can keep one component set and skin it through theme tokens.

## CSS Decisions Worth Reusing

- Global selection color styling.
- Custom scrollbar styling for both dark and light themes.
- Mild global zoom lock (`html { zoom: 0.90; }`), though this should be reconsidered before reuse.
- Light-mode overrides target existing utility classes rather than rewriting components.

## Component Grammar

Most sections follow this reusable grammar:

- section wrapper with `max-w-6xl mx-auto px-4`
- heading row with:
  - narrow colored vertical bar
  - bold title
  - optional small badge or item count
- content block using cards, image thumbnails, and muted metadata
- hover behavior that changes border, glow, and title color

## Data/Product Pattern

This is not just a blog theme. It is a content community platform:

- stories/posts are the central content object
- categories drive discovery
- trending, featured, recent, comments, and spotlight modules build the homepage
- profile, messages, forums, notifications, and admin tools extend the platform

For `anime-blog`, we can keep the same structure but map the content model to:

- articles/reviews instead of stories
- genres/tags instead of horror categories
- featured anime, seasonal picks, trending posts, top creators, watchlists

## Best Adaptation For `anime-blog`

Keep:

- sticky header
- dark-first shell
- hero slideshow
- stacked editorial homepage
- card-based discovery sections
- left-content/right-sidebar layout band
- rich footer
- theme toggle

Change:

- brand green/red accent mix to an anime-specific palette
- horror language to anime/editorial language
- category iconography
- section names and CTA copy
- utility widgets so they match anime use cases

## Suggested `anime-blog` Translation

- `Featured Stories` -> `Featured Reviews` or `Spotlight Features`
- `Story of the Day` -> `Anime of the Day`
- `Trending Stories` -> `Trending This Week`
- `Browse by Category` -> `Browse by Genre`
- `Writer of the Month` -> `Creator Spotlight`
- `Latest Stories` -> `Latest Posts`

## Files That Define The Current Design

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `app/components/ui/Header.tsx`
- `app/components/ui/Footer.tsx`
- `app/components/ui/SlideshowClient.tsx`
- `app/components/ui/FeaturedStories.tsx`
- `app/components/ui/TrendingStories.tsx`
- `app/components/ui/CategoriesShowcase.tsx`

## Notes Before Reusing

- The project name/content is inconsistent in places, but the layout system itself is cohesive.
- Some comments and labels still reflect older theme wording.
- The visual structure is stronger than the current branding consistency, so reuse the structure first and refine the palette second.
