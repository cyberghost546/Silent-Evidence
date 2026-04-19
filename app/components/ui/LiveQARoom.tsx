'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Question {
  id: number;
  question: string;
  answer: string | null;
  isAnonymous: boolean;
  upvotes: number;
  answered: boolean;
  createdAt: string;
}

interface Props {
  sessionId: number;
  title: string;
  authorUsername: string;
  isAuthor: boolean;
}

export default function LiveQARoom({ sessionId, title, authorUsername, isAuthor }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [draft, setDraft] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answerDraft, setAnswerDraft] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/qa/${sessionId}/questions`);
    if (res.ok) setQuestions(await res.json());
  }, [sessionId]);

  // Poll for new questions every 10 seconds
  useEffect(() => {
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  async function submitQuestion() {
    if (draft.trim().length < 5) { setError('Question too short'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/qa/${sessionId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: draft, isAnonymous }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return; }
      setDraft('');
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function upvote(questionId: number) {
    await fetch(`/api/qa/${sessionId}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId }),
    });
    load();
  }

  async function postAnswer(questionId: number) {
    const answer = answerDraft[questionId]?.trim();
    if (!answer) return;
    await fetch(`/api/qa/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, answer }),
    });
    setAnswerDraft((prev) => { const n = { ...prev }; delete n[questionId]; return n; });
    load();
  }

  const unanswered = questions.filter((q) => !q.answered);
  const answered = questions.filter((q) => q.answered);

  return (
    <div className="space-y-6">
      {/* Session title */}
      <div className="bg-gray-900 border border-red-900/40 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-xs font-medium uppercase tracking-wide">Live</span>
        </div>
        <h2 className="text-white font-bold">{title}</h2>
        <p className="text-gray-500 text-sm mt-1">{questions.length} questions · hosted by {authorUsername}</p>
      </div>

      {/* Ask a question */}
      {!isAuthor && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-gray-300 font-medium mb-3">Ask a question</h3>
          <textarea
            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-gray-200 text-sm
                       resize-none focus:outline-none focus:border-red-800 placeholder-gray-600"
            rows={3}
            placeholder="What inspired you to write the ending of Chapter 3?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            suppressHydrationWarning
          />
          <div className="flex items-center justify-between mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="accent-red-700" />
              <span className="text-gray-500 text-sm">Ask anonymously</span>
            </label>
            <button
              onClick={submitQuestion}
              disabled={submitting}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Sending…' : 'Ask'}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
      )}

      {/* Unanswered questions */}
      {unanswered.length > 0 && (
        <div>
          <h3 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wide">
            Waiting for answer ({unanswered.length})
          </h3>
          <div className="space-y-3">
            {unanswered.map((q) => (
              <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-gray-200 text-sm flex-1">{q.question}</p>
                  <button
                    onClick={() => upvote(q.id)}
                    className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <span className="text-xs">▲</span>
                    <span className="text-xs font-medium">{q.upvotes}</span>
                  </button>
                </div>
                <p className="text-gray-600 text-xs mt-2">
                  {q.isAnonymous ? 'Anonymous' : 'Reader'} · {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
                </p>

                {/* Author answer box */}
                {isAuthor && (
                  <div className="mt-3 border-t border-gray-800 pt-3">
                    <textarea
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-gray-200 text-sm resize-none focus:outline-none focus:border-red-800"
                      rows={2}
                      placeholder="Your answer…"
                      value={answerDraft[q.id] ?? ''}
                      onChange={(e) => setAnswerDraft((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      suppressHydrationWarning
                    />
                    <button
                      onClick={() => postAnswer(q.id)}
                      className="mt-2 px-3 py-1 bg-red-900 hover:bg-red-800 text-white text-xs rounded-lg transition-colors"
                    >
                      Post Answer
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Answered questions */}
      {answered.length > 0 && (
        <div>
          <h3 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wide">
            Answered ({answered.length})
          </h3>
          <div className="space-y-3">
            {answered.map((q) => (
              <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-gray-300 text-sm font-medium mb-3">Q: {q.question}</p>
                <div className="pl-3 border-l-2 border-red-800">
                  <p className="text-gray-400 text-sm">{q.answer}</p>
                  <p className="text-gray-600 text-xs mt-1">— {authorUsername}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {questions.length === 0 && (
        <div className="text-center py-10 text-gray-600">
          <p>No questions yet. Be the first to ask!</p>
        </div>
      )}
    </div>
  );
}
