// tests/narration.test.ts
// Unit tests for the sentence splitter behind the TTS "Listen" feature.
// The splitter feeds the browser speech synth one chunk at a time; the tricky
// parts are keeping terminators, not emitting empty chunks, and breaking up
// over-long sentences so a single utterance never exceeds a safe length.

import { describe, it, expect } from 'vitest';

// The module imports React hooks at top level but the function under test is pure;
// importing the named export does not invoke any hook.
import { splitSentences } from '@/app/components/ui/StoryNarration';

describe('splitSentences', () => {
  it('splits on sentence terminators and keeps them', () => {
    const out = splitSentences('The door creaked. Something moved! Was it real?');
    expect(out).toEqual(['The door creaked.', 'Something moved!', 'Was it real?']);
  });

  it('handles text with no terminator as a single chunk', () => {
    expect(splitSentences('a whisper in the dark')).toEqual(['a whisper in the dark']);
  });

  it('drops empty and whitespace-only fragments', () => {
    const out = splitSentences('One.   Two.    ');
    expect(out).toEqual(['One.', 'Two.']);
  });

  it('returns no chunks for empty or whitespace-only input', () => {
    expect(splitSentences('')).toEqual([]);
    expect(splitSentences('   ')).toEqual([]);
  });

  it('breaks an over-long sentence on commas so no chunk is enormous', () => {
    const clause = 'the house on the hill was old and it groaned in the wind';
    const long = Array.from({ length: 8 }, () => clause).join(', ') + '.';
    const out = splitSentences(long);
    // Every produced chunk must be within the utterance safety limit.
    expect(out.every((s) => s.length <= 240)).toBe(true);
    // And reassembling the words loses nothing.
    expect(out.join(' ').replace(/[.,]/g, '').split(/\s+/).sort())
      .toEqual(long.replace(/[.,]/g, '').split(/\s+/).sort());
  });

  it('keeps a normal-length sentence intact', () => {
    const s = 'It was a dark and stormy night, and the rain fell in torrents.';
    expect(splitSentences(s)).toEqual([s]);
  });
});
