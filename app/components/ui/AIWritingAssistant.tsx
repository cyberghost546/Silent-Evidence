'use client';
// app/components/ui/AIWritingAssistant.tsx
// Floating panel that suggests what happens next in a story.
// Calls /api/ai/suggest with the last ~600 words of the story content.

import { useState } from 'react';

interface Props {
  title: string;
  content: string;
  onInsert: (text: string) => void;
}

export default function AIWritingAssistant({ title, content, onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'continue' | 'prompt' | 'title'>('continue');

  const getSuggestion = async () => {
    if (content.trim().length < 20 && mode === 'continue') {
      setError('Write at least a few sentences first.');
      return;
    }
    setLoading(true);
    setError('');
    setSuggestion('');

    const modePrompts: Record<string, string> = {
      continue: content,
      prompt:   `Generate a horror story opening paragraph for a story titled "${title || 'Untitled'}"`,
      title:    content,
    };

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: modePrompts[mode],
          title,
          mode,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Something went wrong.');
      } else {
        const data = await res.json();
        setSuggestion(data.suggestion ?? '');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700/40 rounded-xl text-sm font-medium text-purple-300 transition"
      >
        AI Writing Assistant
        <span className="text-purple-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 bg-gray-900 border border-purple-800/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
               AI Writing Assistant
            </p>
            <span className="text-[10px] text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded-full">Powered by Claude</span>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2">
            {([
              ['continue', '➤ Continue'],
              ['prompt',   'Starter'],
              ['title',    'Suggest Title'],
            ] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => { setMode(val); setSuggestion(''); setError(''); }}
                className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                  mode === val
                    ? 'bg-purple-700 border-purple-600 text-white'
                    : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500">
            {mode === 'continue' && 'Claude will suggest what happens next based on your story so far.'}
            {mode === 'prompt'   && 'Claude will write an atmospheric opening paragraph for your story.'}
            {mode === 'title'    && 'Claude will suggest a haunting title based on your content.'}
          </p>

          <button
            type="button"
            onClick={getSuggestion}
            disabled={loading}
            className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Thinking…
              </span>
            ) : 'Generate'}
          </button>

          {error && (
            <p className="text-red-400 text-xs bg-red-950/30 border border-red-800/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {suggestion && (
            <div className="space-y-3">
              <div className="bg-gray-800 border border-purple-800/20 rounded-xl p-4">
                <p className="text-sm text-gray-200 leading-relaxed italic">&ldquo;{suggestion}&rdquo;</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onInsert('\n\n' + suggestion)}
                  className="flex-1 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-xl transition"
                >
                  Insert into Story
                </button>
                <button
                  type="button"
                  onClick={getSuggestion}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-xl transition"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestion('')}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-500 text-xs rounded-xl transition"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
