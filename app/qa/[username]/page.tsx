// app/qa/[username]/page.tsx
// Live Q&A session page for a specific author — readers submit questions and
// the author answers them in real time. Questions are polled every 10 seconds.
// Reads the current user's session to determine isAuthor (so the author sees
// answer boxes). Returns notFound() if the username or their active session doesn't exist.
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import LiveQARoom from '@/app/components/ui/LiveQARoom';

interface SessionData {
  userId?: number;
}
const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET ?? 'change-me-32-chars-minimum-secret!',
  cookieName: 'se_session',
};

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `Live Q&A with ${username} | Silent Evidence` };
}

export default async function LiveQAPage({ params }: Props) {
  const { username } = await params;

  const author = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, profile: { select: { avatar: true, bio: true } } },
  });
  if (!author) notFound();

  // Find their active session (most recent)
  const session = await prisma.liveQASession.findFirst({
    where: { authorId: author.id, isActive: true },
    orderBy: { startsAt: 'desc' },
  });

  const ironSession = await getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
  const isAuthor = ironSession.userId === author.id;

  return (
    <main className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Live Q&amp;A with {author.username}
          </h1>
          {author.profile?.bio && <p className="text-gray-400 text-sm">{author.profile.bio}</p>}
        </div>

        {!session ? (
          <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
            <p className="text-gray-400">No active Q&amp;A session right now.</p>
            <p className="text-gray-600 text-sm mt-2">
              Follow {author.username} to get notified when they go live.
            </p>
          </div>
        ) : (
          <LiveQARoom
            sessionId={session.id}
            title={session.title}
            authorUsername={author.username}
            isAuthor={isAuthor}
          />
        )}
      </div>
    </main>
  );
}
