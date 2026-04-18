'use client';

// Download .txt or .md via a regular anchor download
export default function StoryExportButtons({ storyId }: { storyId: number }) {
  const base = `/api/stories/${storyId}/export`;

  return (
    <div className="mt-8 border border-gray-700 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 bg-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⬇️</span>
          <span className="font-semibold text-white text-sm">Export Story</span>
        </div>
      </div>
      <div className="bg-gray-900 px-5 py-4 flex flex-wrap gap-3">
        <a
          href={`${base}?format=txt`}
          download
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white transition"
        >
          📄 Download .txt
        </a>
        <a
          href={`${base}?format=md`}
          download
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white transition"
        >
          📝 Download .md
        </a>
      </div>
    </div>
  );
}
