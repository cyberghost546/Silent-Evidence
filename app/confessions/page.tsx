import { Metadata } from 'next';
import ConfessionBooth from '@/app/components/ui/ConfessionBooth';

export const metadata: Metadata = {
  title: 'Confession Booth | Silent Evidence',
  description: 'Whisper your darkest horror confessions anonymously.',
};

export default function ConfessionsPage() {
  return (
    <main className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🕯️</div>
          <h1 className="text-4xl font-bold text-white mb-3">Confession Booth</h1>
          <p className="text-gray-400 text-lg">
            Step inside. Whisper your darkest horror secret.<br />
            The shadows keep no judgement.
          </p>
        </div>

        <ConfessionBooth />
      </div>
    </main>
  );
}
