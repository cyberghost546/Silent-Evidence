// app/settings/page.tsx
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
import PremiumAppearancePicker from '@/app/components/ui/PremiumAppearancePicker';
import Link from 'next/link';

const AGE_CONFIG = {
  UNDER_13: { label: 'Kids Mode',   sub: 'General content only',         color: 'text-blue-400',   dot: 'bg-blue-400'   },
  TEEN:     { label: 'Teen Access', sub: 'General and teen-rated content', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  ADULT:    { label: 'Full Access', sub: 'Unrestricted access to all content', color: 'text-green-400',  dot: 'bg-green-400'  },
} as const;

function Section({ id, title, desc, children }: { id: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-white tracking-tight">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6">
        {children}
      </div>
    </section>
  );
}

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { profile: true, subscription: { select: { status: true } } },
  });
  if (!user) redirect('/login');

  // Admins get all premium perks without a subscription
  const isPremium = user.role === 'ADMIN' || user.subscription?.status === 'active';

  const age = AGE_CONFIG[user.ageGroup as keyof typeof AGE_CONFIG] ?? AGE_CONFIG.ADULT;

  const navLinks = [
    { href: '#profile',       label: 'Profile'         },
    { href: '#age',           label: 'Age & Content'   },
    { href: '#fear-profile',  label: 'Fear Profile'    },
    { href: '#reading-speed', label: 'Reading Speed'   },
    { href: '#notifications', label: 'Notifications'   },
    { href: '#blocked',       label: 'Blocked Users'   },
    { href: '#appearance',    label: 'Appearance'      },
    { href: '#discord',       label: 'Discord'         },
    { href: '#account',       label: 'Account'         },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your profile, preferences, and account.</p>
        </div>

        <div className="flex gap-10">

          {/* Sidebar nav — sticky, desktop only */}
          <aside className="hidden lg:block w-44 shrink-0">
            <nav className="sticky top-24 flex flex-col gap-0.5">
              {navLinks.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg px-3 py-2 transition"
                >
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-8">

            <Section id="profile" title="Profile" desc="Update your public profile information and avatar.">
              <EditProfileForm
                initialData={{
                  username: user.username,
                  bio:      user.profile?.bio     ?? '',
                  avatar:   user.profile?.avatar  ?? '',
                  website:  user.profile?.website ?? '',
                }}
              />
            </Section>

            <Section id="age" title="Age & Content Access" desc="Controls which stories you can read based on content rating.">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${age.dot}`} />
                  <div>
                    <p className={`text-sm font-semibold ${age.color}`}>{age.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{age.sub}</p>
                  </div>
                </div>
                <Link
                  href="/verify-age"
                  className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-2 transition shrink-0"
                >
                  Update
                </Link>
              </div>
            </Section>

            <Section id="fear-profile" title="Fear Profile" desc="Choose up to 3 moods that define your horror taste.">
              <FearProfilePicker initialFearMoods={user.profile?.fearMoods ?? ''} />
            </Section>

            <Section id="reading-speed" title="Reading Speed" desc="Adjust how reading time estimates are calculated for you.">
              <ReadingSpeedSetting initialSpeed={user.readingSpeed} />
            </Section>

            <Section id="notifications" title="Notifications" desc="Choose which emails and alerts you receive.">
              <div className="space-y-3">
                <NewsletterToggle initialSubscribed={user.newsletterSubscribed} />
                <DigestFrequencySelector
                  initialFrequency={(user.digestFrequency ?? 'WEEKLY') as 'DAILY' | 'WEEKLY' | 'NEVER'}
                />
                <PushNotificationToggle />
              </div>
            </Section>

            <Section id="blocked" title="Blocked Users" desc="Block users to hide their content and stop interactions.">
              <BlockedUsersSection />
            </Section>

            <Section id="appearance" title="Profile Appearance" desc="Customise your profile theme and avatar border animation. Premium members only.">
              <PremiumAppearancePicker
                initialTheme={user.profile?.profileTheme ?? 'default'}
                initialBorder={user.profile?.avatarBorder ?? 'none'}
                isPremium={isPremium}
              />
            </Section>

            <Section id="discord" title="Discord" desc="Connect your Discord account to join the community server.">
              <DiscordConnect
                discordUsername={user.discordUsername ?? null}
                isPremium={isPremium}
              />
            </Section>

            <Section id="account" title="Account" desc="Manage your password, privacy, and account deletion.">
              <AccountSettings isPrivate={user.isPrivate} twoFactorEnabled={user.twoFactorEnabled} />
            </Section>

          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
