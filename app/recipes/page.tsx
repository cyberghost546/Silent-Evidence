// app/recipes/page.tsx
// Horror Recipes & Rituals page — a community cookbook of horror-themed food,
// drinks, and rituals. Users can filter by type and react with emoji.
// All data fetching and filtering logic lives inside RecipesFeed.
import { Metadata } from 'next';
import RecipesFeed from '@/app/components/ui/RecipesFeed';

export const metadata: Metadata = {
  title: 'Horror Recipes & Rituals | Silent Evidence',
  description: 'Cursed foods, blood cocktails, and dark rituals. Cook at your own risk.',
};

export default function RecipesPage() {
  return (
    <main className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🍷</div>
          <h1 className="text-4xl font-bold text-white mb-3">Horror Recipes &amp; Rituals</h1>
          <p className="text-gray-400 text-lg">
            Cursed foods. Blood cocktails. Dark rituals.<br />
            Cook at your own risk.
          </p>
        </div>
        <RecipesFeed />
      </div>
    </main>
  );
}
