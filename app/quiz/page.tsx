// app/quiz/page.tsx
// Horror Trivia Quiz page — users answer multiple-choice questions about horror.
// The server fetches the top 10 high scores from the DB to show a leaderboard
// alongside the quiz. The HorrorQuiz component handles the quiz flow client-side.
import Header from '@/app/components/ui/Header';
import Footer from '@/app/components/ui/Footer';
import HorrorQuiz from '@/app/components/ui/HorrorQuiz';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const metadata = { title: 'Horror Trivia Quiz — Silent Evidence' };

export default async function QuizPage() {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0) || null;

  const topScores = await prisma.quizAttempt.findMany({
    orderBy: [{ score: 'desc' }, { completedAt: 'asc' }],
    take: 10,
    include: { user: { select: { username: true } } },
  }).catch(() => []);

  const userBest = userId ? await prisma.quizAttempt.findFirst({
    where: { userId },
    orderBy: { score: 'desc' },
  }).catch(() => null) : null;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-1 h-7 bg-red-600 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-white">Horror Trivia Quiz</h1>
            <p className="text-sm text-gray-500 mt-0.5">10 questions. How well do you know horror?</p>
          </div>
        </div>

        {userBest && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-5 py-3 mb-6 flex items-center gap-3">
            <span className="text-xl">🏆</span>
            <p className="text-sm text-green-400">Your best score: <strong>{userBest.score}/{userBest.total}</strong></p>
          </div>
        )}

        <HorrorQuiz isLoggedIn={!!userId} />

        {/* Leaderboard */}
        {topScores.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-bold text-white mb-4">🏅 Top Scores</h2>
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              {topScores.map((attempt, i) => (
                <div key={attempt.id} className={`flex items-center gap-4 px-5 py-3 ${i < topScores.length - 1 ? 'border-b border-gray-700' : ''}`}>
                  <span className={`text-sm font-bold w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-600' : 'text-gray-600'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <Link href={`/user/${attempt.user.username}`} className="text-sm text-white hover:text-red-400 transition flex-1">{attempt.user.username}</Link>
                  <span className="text-sm font-bold text-white">{attempt.score}<span className="text-gray-500 font-normal">/{attempt.total}</span></span>
                  <span className="text-xs text-gray-600">{Math.round(attempt.score / attempt.total * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
