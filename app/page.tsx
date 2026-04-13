// app/page.tsx
// The homepage — the first page users see when they visit silentevidence.com.
// It's a server component that composes many smaller section components together
// in a top-to-bottom layout. Each section component handles its own data fetching.
// To reorder sections, just move the component lines up or down.
// To remove a section, delete its line (and its import above).

import Header from "./components/ui/Header";
import Footer from "./components/ui/Footer";
import Slideshow from "./components/ui/Slideshow";
import FeaturedStories from "./components/ui/FeaturedStories";
import PopularStories from "./components/ui/PopularStories";
import CategoriesShowcase from "./components/ui/CategoriesShowcase";
import LatestStories from "./components/ui/LatestStories";
import TrendingStories from "./components/ui/TrendingStories";
import StoryOfTheDay from "./components/ui/StoryOfTheDay";
import PickOfMonth from "./components/ui/CreepyOfMonth";
import ChallengeCountdownSection from "./components/ui/ChallengeCountdownSection";
import JoinBanner from "./components/ui/JoinBanner";
import RecentComments from "./components/ui/RecentComments";
import WriterOfMonth from "./components/ui/WriterOfMonth";
import TrendingTags from "./components/ui/TrendingTags";
import StoryOfTheWeek from "./components/ui/StoryOfTheWeek";
import AnimeCalendar from "./components/ui/HorrorCalendar";
import FollowSuggestions from "./components/ui/FollowSuggestions";
import WritingPromptBanner from "./components/ui/WritingPromptBanner";
import TipLeaderboard from "./components/ui/TipLeaderboard";
import HomepageVideos from "./components/ui/HomepageVideos";
import CommunityStats from "./components/ui/CommunityStats";
import HorrorQuoteOfDay from "./components/ui/HorrorQuoteOfDay";

export default function Home() {
  return (
    <main className="bg-gray-900 text-white">
      <Header />

      {/* Writing prompt banner — shown at the very top below the header.
          Displays a random community writing prompt to inspire visitors. */}
      <WritingPromptBanner />

      {/* Hero slideshow — large rotating banner of featured/highlighted stories */}
      <Slideshow />

      {/* Editor's hand-picked featured stories */}
      <FeaturedStories />

      {/* Latest horror video content */}
      <HomepageVideos />

      {/* Story of the Day — a single highlighted story chosen daily */}
      <StoryOfTheDay />

      {/* Story of the Week — similar to above but weekly spotlight */}
      <StoryOfTheWeek />

      {/* Active writing challenge with a countdown timer */}
      <ChallengeCountdownSection />
      <PickOfMonth />
      {/* Writer of the Month spotlight — below Pick of the Month */}
      <WriterOfMonth />

      {/* Grid of all story categories (Ghost Stories, Paranormal, etc.) */}
      <CategoriesShowcase />

      {/* Follow suggestions — horizontal scrollable row of authors to follow */}
      <div className="max-w-6xl mx-auto px-4 pb-6">
        <FollowSuggestions />
      </div>

      {/* Main content area: 2-column layout on large screens.
          Left (2/3): latest stories feed. Right (1/3): sidebar widgets. */}
      <div className="max-w-6xl mx-auto px-4 pb-14 grid lg:grid-cols-3 gap-6 lg:gap-10">
        {/* standalone prop tells LatestStories to render its own heading and controls */}
        <div className="lg:col-span-2"><LatestStories standalone /></div>
        {/* Sidebar: trending stories + quote of the day + tip leaderboard + horror calendar */}
        <div className="space-y-6">
          <TrendingStories />
          <HorrorQuoteOfDay />
          <TipLeaderboard />
          <AnimeCalendar />
        </div>
      </div>

      {/* Horizontally scrollable row of trending hashtags/tags */}
      <TrendingTags />

      {/* Most-liked stories across all time */}
      <PopularStories />

      {/* Call-to-action banner encouraging visitors to create an account */}
      <JoinBanner />

      {/* Feed of the most recent comments across all stories */}
      <RecentComments />

      <Footer />
    </main>
  );
}
