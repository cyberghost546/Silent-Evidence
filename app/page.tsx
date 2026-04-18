// app/page.tsx
// The homepage — the first page users see when they visit silentevidence.com.
// Suspense boundaries around each heavy section let them stream in independently
// so the page feels fast even if one section's DB query is slow.

import { Suspense } from "react";
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
import HorrorCalendar from "./components/ui/HorrorCalendar";
import FollowSuggestions from "./components/ui/FollowSuggestions";
import WritingPromptBanner from "./components/ui/WritingPromptBanner";
import TipLeaderboard from "./components/ui/TipLeaderboard";
import HomepageVideos from "./components/ui/HomepageVideos";
import StoryBattle from "./components/ui/StoryBattle";
import VillainOfWeek from "./components/ui/VillainOfWeek";
import HorrorQuoteOfDay from "./components/ui/HorrorQuoteOfDay";
import LastWordsFeed from "./components/ui/LastWordsFeed";
import MoodOfDay from "./components/ui/MoodOfDay";
import {
  StoryCardSkeleton,
  StoryGridSkeleton,
  TrendingRowSkeleton,
  Skeleton,
} from "./components/ui/Skeleton";
import ContinueReading from "./components/ui/ContinueReading";
import { getSessionUserId } from "@/lib/session";

// ── Lightweight inline fallbacks ──────────────────────────────────────────────

function SlideshowFallback() {
  return <div className="skeleton-shimmer w-full h-105 md:h-130 rounded-none" />;
}

function SectionFallback({ rows = 3 }: { rows?: number }) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Skeleton className="h-6 w-48 mb-6" />
      <StoryGridSkeleton count={rows} />
    </div>
  );
}

function WideCardFallback() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden flex flex-col md:flex-row">
        <Skeleton className="w-full md:w-80 h-52 rounded-none shrink-0" />
        <div className="p-6 flex-1 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}

function SidebarFallback() {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        <TrendingRowSkeleton count={4} />
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-3">
        <Skeleton className="h-5 w-36" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentsFallback() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
      <Skeleton className="h-6 w-40 mb-2" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl p-4 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Home() {
  const userId = await getSessionUserId();

  return (
    <main className="bg-gray-900 text-white">
      <Header />

      <Suspense>
        <WritingPromptBanner />
      </Suspense>

      <Suspense>
        <MoodOfDay />
      </Suspense>

      <Suspense fallback={<SlideshowFallback />}>
        <Slideshow />
      </Suspense>

      {/* Continue Reading — client component, reads from localStorage, no Suspense needed */}
      <ContinueReading />

      <Suspense fallback={<SectionFallback rows={3} />}>
        <FeaturedStories />
      </Suspense>

      <Suspense fallback={<SectionFallback rows={3} />}>
        <HomepageVideos />
      </Suspense>

      <Suspense fallback={<WideCardFallback />}>
        <StoryOfTheDay />
      </Suspense>

      <Suspense fallback={<WideCardFallback />}>
        <StoryOfTheWeek />
      </Suspense>

      <Suspense>
        <ChallengeCountdownSection />
      </Suspense>

      <Suspense>
        <PickOfMonth />
      </Suspense>

      <Suspense>
        <WriterOfMonth />
      </Suspense>

      {/* Story Battle — client component, handles its own loading state */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <StoryBattle userId={userId} />
      </div>

      <Suspense fallback={<SectionFallback rows={8} />}>
        <CategoriesShowcase />
      </Suspense>

      <Suspense>
        <div className="max-w-6xl mx-auto px-4 pb-6">
          <FollowSuggestions />
        </div>
      </Suspense>

      {/* Main 2-col grid: latest stories + sidebar */}
      <div className="max-w-6xl mx-auto px-4 pb-14 grid lg:grid-cols-3 gap-6 lg:gap-10">
        <div className="lg:col-span-2">
          <Suspense fallback={
            <div className="space-y-4">
              <Skeleton className="h-6 w-36 mb-2" />
              {[...Array(5)].map((_, i) => <StoryCardSkeleton key={i} />)}
            </div>
          }>
            <LatestStories standalone />
          </Suspense>
        </div>
        <div className="space-y-6">
          <Suspense fallback={<SidebarFallback />}>
            <TrendingStories />
            <TipLeaderboard />
            <HorrorCalendar />
          </Suspense>
          {/* Client components — no Suspense needed */}
          <VillainOfWeek userId={userId} />
          <HorrorQuoteOfDay />
        </div>
      </div>

      <Suspense>
        <TrendingTags />
      </Suspense>

      <Suspense fallback={<SectionFallback rows={6} />}>
        <PopularStories />
      </Suspense>

      <JoinBanner />

      <Suspense fallback={<CommentsFallback />}>
        <RecentComments />
      </Suspense>

      {/* Last Words — client component, handles its own loading state */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        <LastWordsFeed userId={userId} />
      </div>

      <Footer />
    </main>
  );
}
