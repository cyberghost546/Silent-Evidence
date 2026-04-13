// app/settings/page.tsx
// Server component — loads the current user's data and passes it to the form.
// Redirects to /login if the user is not logged in.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import EditProfileForm from '@/app/components/ui/EditProfileForm';
import FearProfilePicker from '@/app/components/ui/FearProfilePicker';
import AccountSettings from '@/app/components/ui/AccountSettings';
import BlockedUsersSection from '@/app/components/ui/BlockedUsersSection';
import ReadingSpeedSetting from '@/app/components/ui/ReadingSpeedSetting';
import NewsletterToggle from '@/app/components/ui/NewsletterToggle';
import PushNotificationToggle from '@/app/components/ui/PushNotificationToggle';
import DigestFrequencySelector from '@/app/components/ui/DigestFrequencySelector';
import DiscordConnect from '@/app/components/ui/DiscordConnect';
import Link from 'next/link';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);

  if (!userId) redirect('/login');

  // Fetch the current user including their profile so the form shows existing values
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { profile: true, subscription: { select: { status: true } } },
    // isPrivate needed for the private profile toggle
  });

  if (!user) redirect('/login');

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
          <p className="text-gray-500 text-sm mt-1">Update your personal information and avatar.</p>
          <div className="mt-4 h-px bg-gradient-to-r from-red-600/50 to-transparent" />
        </div>

        {/* Pass current values to the form as initial data */}
        <EditProfileForm
          initialData={{
            username: user.username,
            bio:      user.profile?.bio     ?? '',
            avatar:   user.profile?.avatar  ?? '',
            website:  user.profile?.website ?? '',
          }}
        />

        {/* Age & Content Rating section */}
        <div className="mt-10">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Age & Content Access</h2>
            <p className="text-gray-500 text-sm mt-1">Controls which stories you can read based on their content rating.</p>
            <div className="mt-3 h-px bg-gradient-to-r from-red-600/50 to-transparent" />
          </div>
          <div className="border border-gray-800 rounded-xl p-4 bg-gray-900 flex items-center justify-between gap-4">
            <div>
              {/* Show current age group with icon */}
              {user.ageGroup === 'UNDER_13' && <p className="text-sm font-semibold text-blue-400">🔵 Kids Mode (under 13)</p>}
              {user.ageGroup === 'TEEN'     && <p className="text-sm font-semibold text-yellow-400">🟡 Teen Access (13–17)</p>}
              {user.ageGroup === 'ADULT'    && <p className="text-sm font-semibold text-green-400">🟢 Full Access (18+)</p>}
              <p className="text-xs text-gray-500 mt-0.5">
                {user.ageGroup === 'UNDER_13' && 'You can read general stories rated for all ages.'}
                {user.ageGroup === 'TEEN'     && 'You can read general and teen-rated content.'}
                {user.ageGroup === 'ADULT'    && 'You have unrestricted access to all content.'}
              </p>
            </div>
            <Link
              href="/verify-age"
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-2 transition flex-shrink-0"
            >
              Update Age
            </Link>
          </div>
        </div>

        {/* Fear Profile section — lets user pick up to 3 horror moods */}
        <div className="mt-10">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Fear Profile</h2>
            <p className="text-gray-500 text-sm mt-1">What kind of horror speaks to you?</p>
            <div className="mt-3 h-px bg-gradient-to-r from-red-600/50 to-transparent" />
          </div>
          <FearProfilePicker initialFearMoods={user.profile?.fearMoods ?? ''} />
        </div>
        {/* Reading Speed section */}
        <div className="mt-10">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Reading Speed</h2>
            <p className="text-gray-500 text-sm mt-1">Adjust how reading times are estimated for you.</p>
            <div className="mt-3 h-px bg-gradient-to-r from-red-600/50 to-transparent" />
          </div>
          <ReadingSpeedSetting initialSpeed={user.readingSpeed} />
        </div>

        {/* Newsletter section */}
        <div className="mt-10">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Notifications</h2>
            <p className="text-gray-500 text-sm mt-1">Choose which emails you receive from us.</p>
            <div className="mt-3 h-px bg-gradient-to-r from-red-600/50 to-transparent" />
          </div>
          <div className="space-y-3">
            <NewsletterToggle initialSubscribed={user.newsletterSubscribed} />
            {/* Digest frequency — how often to receive comment summary emails */}
            <DigestFrequencySelector
              initialFrequency={(user.digestFrequency ?? 'WEEKLY') as 'DAILY' | 'WEEKLY' | 'NEVER'}
            />
            {/* Push toggle is purely client-side — no server data needed */}
            <PushNotificationToggle />
          </div>
        </div>

        {/* Blocked Users section */}
        <div className="mt-10">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Blocked Users</h2>
            <p className="text-gray-500 text-sm mt-1">Block users to hide their content and prevent them from interacting with you.</p>
            <div className="mt-3 h-px bg-gradient-to-r from-red-600/50 to-transparent" />
          </div>
          <BlockedUsersSection />
        </div>

        {/* Discord connection */}
        <div className="mt-10">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Discord</h2>
            <p className="text-gray-500 text-sm mt-1">Connect your Discord account to join the community server.</p>
            <div className="mt-3 h-px bg-gradient-to-r from-red-600/50 to-transparent" />
          </div>
          {/* Pass current Discord username (null if not connected) and premium status */}
          <DiscordConnect
            discordUsername={user.discordUsername ?? null}
            isPremium={user.subscription?.status === 'active'}
          />
        </div>

        {/* Account settings — privacy, change password, delete account */}
        <div className="mt-10">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Account</h2>
            <p className="text-gray-500 text-sm mt-1">Manage your account security and privacy settings.</p>
            <div className="mt-3 h-px bg-gradient-to-r from-red-600/50 to-transparent" />
          </div>
          <AccountSettings isPrivate={user.isPrivate} twoFactorEnabled={user.twoFactorEnabled} />
        </div>
      </div>
      <Footer />
    </main>
  );
}
