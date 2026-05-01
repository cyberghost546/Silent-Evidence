'use client';
// =============================================================================
// LiveQARoom.tsx  —  CLIENT COMPONENT
// =============================================================================
// Purpose:
//   A real-time Q&A widget that can be embedded on a story or author page.
//   Readers submit questions; the author sees an answer textarea under each
//   unanswered question and can post a reply. Questions are sorted into
//   two groups: "Waiting for answer" and "Answered".
//
// Usage:
//   <LiveQARoom
//     sessionId={session.id}
//     title={session.title}
//     authorUsername={author.username}
//     isAuthor={currentUserId === author.id}
//   />
//
// Props:
//   sessionId      — DB id of the QA session (scopes all API calls)
//   title          — display title for the session header
//   authorUsername — shown next to answers and in the session subtitle
//   isAuthor       — when true: hides the "Ask a question" form and shows
//                    an answer textarea under every unanswered question
//
// API surface:
//   GET  /api/qa/[sessionId]/questions   → Question[]
//   POST /api/qa/[sessionId]/questions   → creates a question, returns Question
//   POST /api/qa/[sessionId]/upvote      → increments upvotes on a question
//   POST /api/qa/[sessionId]/answer      → posts the author's answer
//
// Architecture notes:
//   - Questions are polled every 10 seconds (setInterval) so new questions
//     appear for the author without a page refresh. A WebSocket approach would
//     be more efficient but polling is simpler for low-traffic sessions.
//   - load() is wrapped in useCallback so the interval captures a stable
//     reference — without this, the closure inside setInterval would hold a
//     stale version of `load` after re-renders.
//   - answerDraft is a Record<number, string> keyed by question id so each
//     question has its own independent draft textarea.
//   - date-fns formatDistanceToNow is used for "5 minutes ago" timestamps
//     without a full Intl.RelativeTimeFormat setup.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

// ── Type definitions ──────────────────────────────────────────────────────────

// Shape of a single Q&A question as returned by the API.
interface Question {
  id: number;
  question: string;          // the reader's question text
  answer: string | null;     // the author's reply, or null if unanswered
  isAnonymous: boolean;      // whether the questioner chose to remain anonymous
  upvotes: number;           // number of upvotes from other readers
  answered: boolean;         // convenience flag — true when answer is non-null
  createdAt: string;         // ISO timestamp string
}

// Props accepted by this component.
interface Props {
  sessionId: number;         // scopes all API calls to this session
  title: string;             // session title shown in the header card
  authorUsername: string;    // displayed next to posted answers
  isAuthor: boolean;         // switches between reader view and author view
}

export default function LiveQARoom({ sessionId, title, authorUsername, isAuthor }: Props) {

  // ── State ─────────────────────────────────────────────────────────────────

  // Full list of questions for this session (polled every 10 seconds).
  const [questions, setQuestions] = useState<Question[]>([]);

  // Controlled value for the reader's "Ask a question" textarea.
  const [draft, setDraft] = useState('');

  // Whether the current user chose to ask anonymously (checkbox toggle).
  const [isAnonymous, setIsAnonymous] = useState(false);

  // True while the POST question request is in-flight — disables the Ask button.
  const [submitting, setSubmitting] = useState(false);

  // Per-question draft answers, keyed by question id.
  // Record<number, string> allows each question to have an independent textarea.
  const [answerDraft, setAnswerDraft] = useState<Record<number, string>>({});

  // Inline error message shown below the compose textarea.
  const [error, setError] = useState('');

  // ── load: fetch all questions for this session ────────────────────────────
  // Wrapped in useCallback with [sessionId] as the dependency so the reference
  // is stable across re-renders. Without this, the setInterval below would
  // capture a stale closure and potentially use an outdated sessionId.
  const load = useCallback(async () => {
    const res = await fetch(`/api/qa/${sessionId}/questions`);
    if (res.ok) setQuestions(await res.json());
  }, [sessionId]);

  // ── Side effect: initial load + 10-second polling interval ───────────────
  // Questions are polled every 10 seconds so the author sees new questions
  // appear without refreshing the page. The cleanup function stops the interval
  // when the component unmounts to avoid memory leaks.
  useEffect(() => {
    load();                                     // fetch immediately on mount
    const interval = setInterval(load, 10_000); // then every 10 seconds
    return () => clearInterval(interval);       // cleanup on unmount
  }, [load]); // re-run if `load` changes (i.e. if sessionId changes)

  // ── submitQuestion: POST a new question to the API ────────────────────────
  // Validates that the draft is at least 5 characters, then sends it.
  // On success: clears the draft and refreshes the question list.
  async function submitQuestion() {
    // Client-side minimum length guard — 5 chars prevents one-word "questions".
    if (draft.trim().length < 5) {
      setError('Question too short');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/qa/${sessionId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // isAnonymous tells the server not to associate this question with a user.
        body: JSON.stringify({ question: draft, isAnonymous }),
      });

      if (!res.ok) {
        // Surface the server's error message (e.g. rate limit, auth required).
        const d = await res.json();
        setError(d.error ?? 'Failed');
        return;
      }

      setDraft('');  // clear the compose box on success
      load();        // immediately refresh to show the new question
    } finally {
      setSubmitting(false); // always re-enable the button
    }
  }

  // ── upvote: increment the upvote count on a question ─────────────────────
  // Sends a POST and immediately re-fetches the question list so the new count
  // appears without waiting for the next 10-second poll cycle.
  async function upvote(questionId: number) {
    await fetch(`/api/qa/${sessionId}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId }),
    });
    load(); // re-fetch so the updated upvote count renders immediately
  }

  // ── postAnswer: submit the author's answer for a specific question ────────
  // Only accessible when isAuthor is true. Clears the per-question draft on
  // success and re-fetches to move the question from "Waiting" → "Answered".
  async function postAnswer(questionId: number) {
    const answer = answerDraft[questionId]?.trim();
    if (!answer) return; // ignore empty submissions

    await fetch(`/api/qa/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionId, answer }),
    });

    // Remove this question's draft from the record (keeps others intact).
    setAnswerDraft((prev) => {
      const n = { ...prev };
      delete n[questionId];
      return n;
    });

    load(); // re-fetch to move this question to the "Answered" section
  }

  // ── Derived lists ─────────────────────────────────────────────────────────
  // Split questions into two display groups so the author can see which still
  // need responses and readers can read completed exchanges.
  const unanswered = questions.filter((q) => !q.answered);
  const answered   = questions.filter((q) =>  q.answered);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // space-y-6 — vertical rhythm between the session header, compose box,
    // unanswered section, and answered section.
    <div className="space-y-6">

      {/* ── Session header card ────────────────────────────────────────────── */}
      {/* Shows the "LIVE" indicator, session title, and question/host info. */}
      <div className="bg-gray-900 border border-red-900/40 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          {/* Pulsing red dot — the CSS `animate-pulse` class creates a breathing
              effect that communicates "this is a live/active session". */}
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-xs font-medium uppercase tracking-wide">Live</span>
        </div>
        <h2 className="text-white font-bold">{title}</h2>
        <p className="text-gray-500 text-sm mt-1">
          {questions.length} questions · hosted by {authorUsername}
        </p>
      </div>

      {/* ── Ask a question form (reader view only) ──────────────────────────── */}
      {/* Only rendered when the current user is NOT the author.
          The author sees answer boxes instead — they don't ask themselves questions. */}
      {!isAuthor && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-gray-300 font-medium mb-3">Ask a question</h3>

          {/* Controlled textarea — value tied to `draft` state.
              suppressHydrationWarning prevents React from complaining about the
              intentional empty-on-server / potentially-non-empty-on-client mismatch. */}
          <textarea
            className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-gray-200 text-sm
                       resize-none focus:outline-none focus:border-red-800 placeholder-gray-600"
            rows={3}
            placeholder="What inspired you to write the ending of Chapter 3?"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            suppressHydrationWarning
          />

          {/* Row: anonymous toggle + submit button */}
          <div className="flex items-center justify-between mt-3">

            {/* Anonymous checkbox — accent-red-700 applies the brand colour to the
                native checkbox in supporting browsers (Chrome/Edge). */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="accent-red-700"
              />
              <span className="text-gray-500 text-sm">Ask anonymously</span>
            </label>

            {/* Submit button — disabled while the POST is in-flight */}
            <button
              onClick={submitQuestion}
              disabled={submitting}
              className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white text-sm rounded-lg disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Sending…' : 'Ask'}
            </button>
          </div>

          {/* Inline error message (validation or API error) */}
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
      )}

      {/* ── Unanswered questions section ────────────────────────────────────── */}
      {/* Only rendered when there is at least one unanswered question. */}
      {unanswered.length > 0 && (
        <div>
          <h3 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wide">
            Waiting for answer ({unanswered.length})
          </h3>

          <div className="space-y-3">
            {unanswered.map((q) => (
              <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">

                {/* Question text + upvote button */}
                <div className="flex items-start justify-between gap-3">
                  <p className="text-gray-200 text-sm flex-1">{q.question}</p>

                  {/* Upvote button — triangle arrow + count.
                      flex-shrink-0 prevents the button from being squashed when
                      the question text is long. */}
                  <button
                    onClick={() => upvote(q.id)}
                    className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <span className="text-xs">▲</span>
                    <span className="text-xs font-medium">{q.upvotes}</span>
                  </button>
                </div>

                {/* Attribution + relative timestamp.
                    formatDistanceToNow produces "about 5 minutes ago" style strings.
                    addSuffix: true appends "ago" to the output. */}
                <p className="text-gray-600 text-xs mt-2">
                  {q.isAnonymous ? 'Anonymous' : 'Reader'} ·{' '}
                  {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
                </p>

                {/* ── Author answer box ── only shown when isAuthor is true ─── */}
                {/* Separated by a border-t so it reads as a distinct "reply" area. */}
                {isAuthor && (
                  <div className="mt-3 border-t border-gray-800 pt-3">
                    {/* Per-question controlled textarea.
                        value: answerDraft[q.id] ?? '' — defaults to empty string
                        so React always treats it as a controlled input. */}
                    <textarea
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-gray-200 text-sm resize-none focus:outline-none focus:border-red-800"
                      rows={2}
                      placeholder="Your answer…"
                      value={answerDraft[q.id] ?? ''}
                      onChange={(e) =>
                        // Spread the existing record and update only this question's draft.
                        setAnswerDraft((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
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

      {/* ── Answered questions section ───────────────────────────────────────── */}
      {/* Only rendered when at least one question has been answered.
          Uses a red left border on the answer block to visually distinguish
          the author's reply from the reader's question above it. */}
      {answered.length > 0 && (
        <div>
          <h3 className="text-gray-400 text-sm font-medium mb-3 uppercase tracking-wide">
            Answered ({answered.length})
          </h3>

          <div className="space-y-3">
            {answered.map((q) => (
              <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                {/* Question — font-medium to slightly emphasise the "Q:" */}
                <p className="text-gray-300 text-sm font-medium mb-3">Q: {q.question}</p>

                {/* Answer — indented with a left red border (like a blockquote)
                    to make clear this is the author's response. */}
                <div className="pl-3 border-l-2 border-red-800">
                  <p className="text-gray-400 text-sm">{q.answer}</p>
                  {/* Attribution — em dash + authorUsername */}
                  <p className="text-gray-600 text-xs mt-1">— {authorUsername}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {/* Shown only when there are truly zero questions — before anyone has asked. */}
      {questions.length === 0 && (
        <div className="text-center py-10 text-gray-600">
          <p>No questions yet. Be the first to ask!</p>
        </div>
      )}
    </div>
  );
}
