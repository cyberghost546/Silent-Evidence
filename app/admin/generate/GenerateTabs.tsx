'use client';
// app/admin/generate/GenerateTabs.tsx
// Thin wrapper that renders the two AI generation modes as a tabbed interface.
//   "Batch"  — generates many stories across all categories at once (BatchClient)
//   "Single" — fine-tuned generation of one story with mood/tone controls (GenerateClient)
//
// Batch is the default tab because it's the most-used workflow for seeding the site.
// The categories list is fetched once server-side and passed down to both child components.

import { useState } from 'react';
import GenerateClient from './GenerateClient';
import BatchClient from './BatchClient';
import { Bot, Pencil } from 'lucide-react';

type Category = { id: number; name: string; slug: string };

export default function GenerateTabs({ categories }: { categories: Category[] }) {
  // Which tab is active — defaults to 'batch' since that's the most common workflow
  const [tab, setTab] = useState<'single' | 'batch'>('batch');

  return (
    <div className="max-w-3xl">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-1 h-7 bg-red-500 rounded-full" />
        <div>
          <h1 className="text-2xl font-bold text-white">AI Story Generator</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate horror stories with Claude AI + Unsplash images</p>
        </div>
      </div>

      {/* Tab switcher — highlighted pill shows the active tab */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('batch')}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition ${
            tab === 'batch' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="inline-flex items-center gap-1.5"><Bot className="w-4 h-4" /> Batch (All Categories)</span>
        </button>
        <button
          onClick={() => setTab('single')}
          className={`px-5 py-2 text-sm font-medium rounded-lg transition ${
            tab === 'single' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="inline-flex items-center gap-1.5"><Pencil className="w-4 h-4" /> Single Story</span>
        </button>
      </div>

      {/* Render the appropriate panel based on the active tab */}
      {tab === 'batch' ? (
        <BatchClient categories={categories} />
      ) : (
        <GenerateClient categories={categories} />
      )}
    </div>
  );
}
