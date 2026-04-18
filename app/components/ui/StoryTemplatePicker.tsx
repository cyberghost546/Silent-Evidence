'use client';
// app/components/ui/StoryTemplatePicker.tsx
// Modal-style grid that lets authors pick a horror genre template.
// Calls onSelect(template) when user picks one, so the parent (StoryForm)
// can pre-populate the TipTap editor content and the title placeholder.

import { useState } from 'react';
import { STORY_TEMPLATES, StoryTemplate } from '@/lib/storyTemplates';

interface Props {
  // Called when the user picks a template
  onSelect: (template: StoryTemplate) => void;
  // Called when the user dismisses without picking
  onClose: () => void;
}

export default function StoryTemplatePicker({ onSelect, onClose }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    // Backdrop — click outside to close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Modal panel — stop click propagation so clicking inside doesn't close */}
      <div
        className="relative w-full max-w-2xl bg-gray-950 border border-gray-800 rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Choose a Template</h2>
            <p className="text-xs text-gray-500 mt-0.5">Start with a horror genre opener — you can edit everything.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STORY_TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              onMouseEnter={() => setHovered(template.id)}
              onMouseLeave={() => setHovered(null)}
              className={`text-left p-4 rounded-xl border transition-all duration-150 ${
                hovered === template.id
                  ? 'border-red-600 bg-red-600/10'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}
            >
              {/* Emoji + label */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xl">{template.emoji}</span>
                <span className="text-sm font-semibold text-white">{template.label}</span>
              </div>

              {/* Mood badge */}
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 mb-2">
                {template.mood.replace('_', ' ')}
              </span>

              {/* Preview of opening line */}
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {/* Strip HTML tags for the preview text */}
                {template.content.replace(/<[^>]+>/g, '').slice(0, 120)}…
              </p>
            </button>
          ))}
        </div>

        {/* Start blank option */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 border border-dashed border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500 text-sm rounded-xl transition"
        >
          Start from scratch (no template)
        </button>
      </div>
    </div>
  );
}
