import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Header from '@/app/components/ui/Header';
import StoryEditForm from '@/app/components/ui/StoryEditForm';
import CollaboratorPanel from '@/app/components/ui/CollaboratorPanel';
import ChapterManager from '@/app/components/ui/ChapterManager';
import DraftSharePanel from '@/app/components/ui/DraftSharePanel';
import StoryPlannerPanel from '@/app/components/ui/StoryPlannerPanel';
import StoryExportButtons from '@/app/components/ui/StoryExportButtons';

type Props = { params: Promise<{ slug: string }> };

export default async function EditStoryPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get('userId')?.value ?? 0);
  if (!userId) redirect('/login');

  const story = await prisma.story.findUnique({
    where: { slug },
    include: { category: { select: { id: true, name: true } } },
  });

  if (!story) return notFound();
  if (story.authorId !== userId) redirect('/my-stories');

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-white mb-8">Edit Story</h1>
        <StoryEditForm story={JSON.parse(JSON.stringify(story))} categories={categories} />
        {/* Story planner — drag-and-drop scene outline, auto-saved */}
        <StoryPlannerPanel storyId={story.id} />
        {/* Chapter manager — split story into parts */}
        <ChapterManager storyId={story.id} />
        {/* Draft share links — private token links for unpublished (DRAFT) stories */}
        {story.status === 'DRAFT' && (
          <div className="mt-8">
            <DraftSharePanel storyId={story.id} />
          </div>
        )}
        {/* Export — download story as .txt or .md */}
        <StoryExportButtons storyId={story.id} />
        {/* Co-author panel — invite collaborators, shown only to the story author */}
        <CollaboratorPanel storyId={story.id} />
      </div>
    </main>
  );
}
