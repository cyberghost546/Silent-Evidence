'use client';
// app/components/ui/HorrorQuoteOfDay.tsx
// Sidebar widget that shows one horror/dark quote per day.
// The quote rotates automatically based on the day of the year —
// no server needed, pure client calculation.

import { useMemo } from 'react';

// A collection of atmospheric quotes suitable for a horror community.
// Mix of famous authors, real-life accounts, and anonymous campfire wisdom.
const QUOTES = [
  {
    text: 'The oldest and strongest emotion of mankind is fear, and the oldest and strongest kind of fear is fear of the unknown.',
    author: 'H.P. Lovecraft',
  },
  {
    text: 'No live organism can continue for long to exist sanely under conditions of absolute reality.',
    author: 'Shirley Jackson',
  },
  {
    text: "We accept the love we think we deserve — and the fear we think we've earned.",
    author: 'Anonymous',
  },
  {
    text: "I am not afraid of death, I just don't want to be there when it happens.",
    author: 'Woody Allen',
  },
  {
    text: 'The only thing we have to fear is fear itself — and whatever was in that house.',
    author: 'Campfire saying',
  },
  {
    text: 'Monsters are real, and ghosts are real too. They live inside us, and sometimes, they win.',
    author: 'Stephen King',
  },
  {
    text: 'The most merciful thing in the world, I think, is the inability of the human mind to correlate all its contents.',
    author: 'H.P. Lovecraft',
  },
  {
    text: 'It is a mistake to think you can solve any major problems just with potatoes.',
    author: 'Douglas Adams',
  },
  {
    text: 'No one can make you feel inferior without your consent — but something in that room had mine.',
    author: 'Anonymous',
  },
  {
    text: "Whatever you are, be a good one. Unless you're already something else.",
    author: 'Campfire saying',
  },
  {
    text: "The thing under my bed waiting to grab my ankle isn't real. I know that. And I also know that if I'm careful to keep my foot under the covers, it will never be able to grab my ankle.",
    author: 'Stephen King',
  },
  {
    text: 'Not all those who wander are lost. Some of them never made it back.',
    author: 'Anonymous',
  },
  { text: 'We are all just stories in the end.', author: 'Doctor Who' },
  {
    text: "It's not about whether you believe. It's about whether it believes in you.",
    author: 'Campfire saying',
  },
  {
    text: 'The woods are lovely, dark and deep. But I have promises to keep — and something behind me.',
    author: 'After Robert Frost',
  },
  {
    text: 'Turn off the lights when you leave. If they turn back on, you never left.',
    author: 'Anonymous',
  },
  {
    text: 'There is nothing to fear but fear itself. And the thing that left those footprints.',
    author: 'Anonymous',
  },
  {
    text: 'Death is not the greatest loss in life. The greatest loss is what dies inside us while we live.',
    author: 'Norman Cousins',
  },
  { text: 'I became insane, with long intervals of horrible sanity.', author: 'Edgar Allan Poe' },
  {
    text: 'The universe is under no obligation to make sense to you.',
    author: 'Neil deGrasse Tyson',
  },
  {
    text: 'Being deeply loved by someone gives you strength. Being deeply afraid of something shows you who you really are.',
    author: 'Anonymous',
  },
  {
    text: 'Every day above ground is a good day. Every night is a different matter.',
    author: 'Campfire saying',
  },
  {
    text: 'The oldest stories are the ones about running from something in the dark.',
    author: 'Anonymous',
  },
  {
    text: "What you don't see can't hurt you. What you don't see yet is another matter.",
    author: 'Campfire saying',
  },
  {
    text: 'In the beginning there was nothing, which exploded. Later came the dark.',
    author: 'Anonymous',
  },
  {
    text: "Some people see things that aren't there. Others see things that are there and wish they hadn't.",
    author: 'Anonymous',
  },
  {
    text: 'Sleep is the cousin of death. But some nights, something is awake between them.',
    author: 'Campfire saying',
  },
  {
    text: "Behind every door is a room you haven't entered. Behind every room is a reason no one went in.",
    author: 'Anonymous',
  },
  { text: 'A good scare is worth more to a man than good advice.', author: 'Edgar Watson Howe' },
  {
    text: 'The oldest paths in the world lead into the dark. Most of them were made by things running away.',
    author: 'Anonymous',
  },
];

export default function HorrorQuoteOfDay() {
  // Pick a quote based on the day of the year.
  // This makes the quote change daily without needing an API or database.
  const quote = useMemo(() => {
    const now = new Date();
    // Build a reference date at "day 0" so we can calculate the day-of-year number.
    const start = new Date(now.getFullYear(), 0, 0);
    // Convert the time difference into a whole-day index.
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // Use modulo (%) so the quotes loop if the year has more days than our quote list.
    return QUOTES[dayOfYear % QUOTES.length];
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Quote of the Day
        </h2>
      </div>

      {/* Main quote text */}
      <blockquote className="relative">
        {/* Decorative opening quote mark */}
        <span className="absolute -top-2 -left-1 text-5xl text-red-900/40 font-serif leading-none select-none">
          &ldquo;
        </span>

        <p className="text-sm text-gray-300 italic leading-relaxed pl-4 pr-2 pt-3">{quote.text}</p>

        {/* Attribution */}
        <footer className="mt-3 pl-4">
          <cite className="text-xs text-red-400 not-italic font-medium">— {quote.author}</cite>
        </footer>
      </blockquote>
    </div>
  );
}
