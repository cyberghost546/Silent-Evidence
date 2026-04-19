import { Metadata } from 'next';
import MonsterEncyclopedia from '@/app/components/ui/MonsterEncyclopedia';

export const metadata: Metadata = {
  title: 'Monster Encyclopedia | Silent Evidence',
  description: 'A complete bestiary of horror monsters, creatures, and entities.',
};

export default function MonstersPage() {
  return (
    <main className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">👹</div>
          <h1 className="text-4xl font-bold text-white mb-3">Monster Encyclopedia</h1>
          <p className="text-gray-400 text-lg">
            Know your enemy. Every horror creature, beast, and entity — catalogued.
          </p>
        </div>
        <MonsterEncyclopedia />
      </div>
    </main>
  );
}
