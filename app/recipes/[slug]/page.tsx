import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await prisma.horrorRecipe.findUnique({ where: { slug } });
  if (!recipe) return { title: 'Not Found' };
  return { title: `${recipe.title} | Horror Recipes | Silent Evidence` };
}

export default async function RecipeDetailPage({ params }: Props) {
  const { slug } = await params;
  const raw = await prisma.horrorRecipe.findUnique({
    where: { slug },
    include: { author: { select: { username: true } } },
  });
  if (!raw) notFound();

  const ingredients: string[] = JSON.parse(raw.ingredients);
  const steps: string[] = JSON.parse(raw.steps);

  const TYPE_ICON: Record<string, string> = { food: '🍖', drink: '🍷', ritual: '🕯️' };

  return (
    <main className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Cover */}
        {raw.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={raw.image} alt={raw.title} className="w-full h-56 object-cover rounded-2xl mb-6" />
        )}
        {!raw.image && (
          <div className="w-full h-40 bg-gray-800 rounded-2xl flex items-center justify-center text-6xl text-gray-700 mb-6">
            {TYPE_ICON[raw.type] ?? '🍽️'}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400 capitalize">
              {TYPE_ICON[raw.type]} {raw.type}
            </span>
            <span className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400 capitalize">
              {raw.difficulty}
            </span>
            {raw.prepMins && (
              <span className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400">
                ⏱ {raw.prepMins} min
              </span>
            )}
            {raw.servings && (
              <span className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-400">
                🍽 Serves {raw.servings}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black text-white mb-3">{raw.title}</h1>
          <p className="text-gray-400 leading-relaxed">{raw.description}</p>
          <p className="text-gray-600 text-sm mt-2">by {raw.author.username}</p>
        </div>

        {/* Ingredients */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span>🧪</span> Ingredients
          </h2>
          <ul className="space-y-2">
            {ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                <span className="text-red-700 mt-0.5">•</span>
                {ing}
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <span>📜</span> {raw.type === 'ritual' ? 'The Ritual' : 'Instructions'}
          </h2>
          <ol className="space-y-4">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-red-900/40 border border-red-800 flex items-center justify-center text-red-400 text-xs font-bold">
                  {i + 1}
                </span>
                <p className="text-gray-300 text-sm leading-relaxed pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}
