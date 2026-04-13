'use client';
// app/components/ui/HorrorQuiz.tsx
// An interactive horror trivia quiz with 10 questions.
// Tracks the user's answers as they go, shows correct/incorrect feedback
// after each answer, then displays a full results screen at the end.
// If the user is logged in, their score is saved to the database so it
// can appear on the leaderboard.

import { useState } from 'react';

// The full set of quiz questions.
// Each entry has:
//   q       — the question text
//   options — four possible answers (A, B, C, D)
//   answer  — the index (0-based) of the correct option
const QUESTIONS = [
  { q: 'What is the name of the hotel in Stephen King\'s "The Shining"?', options: ['Bates Motel', 'Overlook Hotel', 'Black Lodge', 'Bly Manor'], answer: 1 },
  { q: 'Which U.S. state has the highest number of reported Bigfoot sightings?', options: ['Oregon', 'Alaska', 'California', 'Washington'], answer: 3 },
  { q: 'The Zodiac Killer was active primarily in which decade?', options: ['1950s', '1960s', '1970s', '1980s'], answer: 1 },
  { q: 'What does "EVP" stand for in paranormal investigation?', options: ['Electronic Voice Phenomenon', 'Extrasensory Visual Perception', 'Eerie Vibration Pattern', 'Energy Vortex Point'], answer: 0 },
  { q: 'The Amityville Horror case took place in which U.S. state?', options: ['Connecticut', 'New York', 'New Jersey', 'Massachusetts'], answer: 1 },
  { q: 'Which famous disappearance involves Flight 19 and a group of U.S. Navy planes?', options: ['Devil\'s Sea', 'Bermuda Triangle', 'Dragon\'s Triangle', 'Lake Erie'], answer: 1 },
  { q: 'What creature is said to roam the Pine Barrens of New Jersey?', options: ['Chupacabra', 'Mothman', 'Jersey Devil', 'Skinwalker'], answer: 2 },
  { q: 'The Dyatlov Pass incident, where 9 hikers died mysteriously, occurred in which country?', options: ['Norway', 'Canada', 'Russia', 'Finland'], answer: 2 },
  { q: 'Ed and Lorraine Warren investigated which haunted house case?', options: ['Annabelle', 'Amityville', 'Enfield Poltergeist', 'All of the above'], answer: 3 },
  { q: 'What is the study of ghosts and hauntings called?', options: ['Demonology', 'Parapsychology', 'Necromancy', 'Thanatology'], answer: 1 },
];

// The quiz moves through three distinct screens (phases):
//   'intro'  — welcome screen with a "Start Quiz" button
//   'quiz'   — one question at a time; locked after an answer is chosen
//   'result' — final score with per-question breakdown
type Phase = 'intro' | 'quiz' | 'result';

export default function HorrorQuiz({ isLoggedIn }: { isLoggedIn: boolean }) {
  // Which screen is currently showing
  const [phase, setPhase]       = useState<Phase>('intro');
  // Index of the question currently on screen (0 to QUESTIONS.length - 1)
  const [current, setCurrent]   = useState(0);
  // Which answer the user clicked for the current question (null = not yet answered)
  const [selected, setSelected] = useState<number | null>(null);
  // Full record of the user's answers — one slot per question, starts as all-null
  const [answers, setAnswers]   = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  // True while the POST to /api/quiz is in flight
  const [saving, setSaving]     = useState(false);
  // True once the score has been saved to the server
  const [saved, setSaved]       = useState(false);

  // Count how many stored answers match the correct answer for that question
  const score = answers.filter((a, i) => a === QUESTIONS[i].answer).length;

  // Called when the user clicks an answer option.
  // Guards against clicking twice (selected !== null means already answered).
  const choose = (opt: number) => {
    if (selected !== null) return; // ignore clicks after an answer is chosen
    setSelected(opt);
    // Store the chosen option in the answers array at the current index
    const next = [...answers];
    next[current] = opt;
    setAnswers(next);
  };

  // Called when the user clicks "Next Question" or "See Results".
  // Moves to the next question, or transitions to the result screen if finished.
  const advance = () => {
    if (current < QUESTIONS.length - 1) {
      setCurrent(c => c + 1); // go to next question
      setSelected(null);       // reset selected so the next question starts unlocked
    } else {
      // Last question answered — show results and save score if logged in
      setPhase('result');
      if (isLoggedIn) saveScore();
    }
  };

  // POST the final score to the server so it's stored in the quiz leaderboard
  const saveScore = async () => {
    setSaving(true);
    await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, total: QUESTIONS.length }),
    });
    setSaving(false);
    setSaved(true);
  };

  // Reset all state so the user can retake the quiz from scratch
  const restart = () => {
    setPhase('intro'); setCurrent(0); setSelected(null);
    setAnswers(Array(QUESTIONS.length).fill(null)); setSaved(false);
  };

  // Shorthand for the current question object
  const q = QUESTIONS[current];
  // Percentage score — used to decide which trophy/emoji to show at the end
  const pct = Math.round(score / QUESTIONS.length * 100);

  // Intro screen — shown before the quiz starts
  if (phase === 'intro') return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center">
      <div className="text-6xl mb-4">💀</div>
      <h2 className="text-xl font-bold text-white mb-2">Horror Trivia Challenge</h2>
      <p className="text-gray-400 mb-6">10 questions on true crime, paranormal cases, and horror history. No time limit.</p>
      <button
        type="button"
        onClick={() => setPhase('quiz')}
        className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm"
      >
        Start Quiz
      </button>
    </div>
  );

  // Results screen — shown after all questions are answered
  if (phase === 'result') return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 text-center">
      {/* Trophy/emoji based on performance tier */}
      <div className="text-6xl mb-4">{pct >= 80 ? '🏆' : pct >= 50 ? '💀' : '😨'}</div>
      <h2 className="text-2xl font-bold text-white mb-1">{score} / {QUESTIONS.length}</h2>
      <p className="text-gray-400 mb-2">{pct}% correct</p>
      {/* Motivational message based on score percentage */}
      <p className="text-lg text-white mb-6">
        {pct >= 90 ? 'Horror Expert! 🏅' : pct >= 70 ? 'True Investigator! 🔍' : pct >= 50 ? 'Getting darker... 🕯️' : 'Keep digging into the darkness! 📖'}
      </p>
      {/* Confirmation that score was saved */}
      {saved && <p className="text-xs text-red-400 mb-4">✓ Score saved to leaderboard</p>}
      {/* Prompt to log in if the user is not authenticated */}
      {!isLoggedIn && <p className="text-xs text-gray-500 mb-4">Log in to save your score to the leaderboard</p>}
      {/* Review all questions with correct/incorrect indicators */}
      <div className="flex flex-col gap-3 mb-6">
        {QUESTIONS.map((q, i) => (
          <div key={i} className={`flex items-start gap-3 text-left p-3 rounded-xl text-sm ${answers[i] === q.answer ? 'bg-red-500/10 border border-red-500/20' : 'bg-gray-700/30 border border-gray-700'}`}>
            <span className="shrink-0 mt-0.5">{answers[i] === q.answer ? '✅' : '❌'}</span>
            <div>
              <p className="text-gray-300 text-xs mb-1">{q.q}</p>
              {/* Always show the correct answer */}
              <p className="text-xs font-semibold text-white">{q.options[q.answer]}</p>
              {/* Show user's incorrect answer if they got it wrong */}
              {answers[i] !== q.answer && <p className="text-xs text-red-400">You answered: {q.options[answers[i] ?? 0]}</p>}
            </div>
          </div>
        ))}
      </div>
      {/* Button to restart the quiz */}
      <button type="button" onClick={restart} className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition">
        Try Again
      </button>
    </div>
  );

  // Active quiz screen — displays the current question and answer options
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8">
      {/* Progress indicator showing current question number */}
      <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
        <span>Question {current + 1} of {QUESTIONS.length}</span>
        <span>{current} answered</span>
      </div>
      {/* Red progress bar showing how far along the quiz the user is */}
      <div className="w-full h-1.5 bg-gray-700 rounded-full mb-6">
        <div className="h-1.5 bg-red-600 rounded-full transition-all" style={{ width: `${(current / QUESTIONS.length) * 100}%` }} />
      </div>

      {/* Current question text */}
      <h2 className="text-lg font-semibold text-white mb-6 leading-snug">{q.q}</h2>

      {/* Answer option buttons — styled based on selection correctness */}
      <div className="flex flex-col gap-3 mb-6">
        {q.options.map((opt, i) => {
          // Determine this button's visual state after the user has answered:
          const isSelected = selected === i;              // the option the user clicked
          const isCorrect  = selected !== null && i === q.answer; // always highlight the right answer
          const isWrong    = isSelected && i !== q.answer;        // the user's wrong pick

          // Buttons are disabled as soon as an answer is chosen — prevents changing mid-question
          return (
            <button key={i} type="button" onClick={() => choose(i)} disabled={selected !== null}
              className={`w-full text-left px-5 py-3.5 rounded-xl border text-sm font-medium transition ${
                isCorrect ? 'bg-red-500/20 border-red-500 text-red-300' :   // red = correct
                isWrong   ? 'bg-gray-600/30 border-gray-500 text-gray-400' : // muted = wrong pick
                isSelected ? 'bg-gray-700 border-gray-500 text-white' :      // selected but not yet revealed
                'bg-gray-900 border-gray-700 hover:border-gray-500 hover:bg-gray-800 text-gray-300 disabled:cursor-default'
              }`}>
              {/* Letter label (A, B, C, D) before the answer text */}
              <span className="mr-3 text-gray-500">{['A', 'B', 'C', 'D'][i]}.</span>{opt}
            </button>
          );
        })}
      </div>

      {/* Next/Results button — only shown after the user selects an answer */}
      {selected !== null && (
        <button type="button" onClick={advance}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm">
          {current < QUESTIONS.length - 1 ? 'Next Question →' : 'See Results'}
        </button>
      )}
    </div>
  );
}
