// POST /api/translate
// Translates text using the unofficial Google Translate API (no key, no daily limit).
// Languages with a `bridge` (e.g. Papiamento → Spanish → target) are handled automatically.

import { NextResponse } from 'next/server';
import { LANGUAGES } from '@/lib/languages';

// Keep chunks small enough to fit in a URL safely
const MAX_CHARS = 1000;

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  for (const para of paragraphs) {
    if (para.length <= MAX_CHARS) {
      chunks.push(para);
      continue;
    }
    const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
    let current = '';
    for (const sentence of sentences) {
      if ((current + sentence).length > MAX_CHARS) {
        if (current) chunks.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }
  return chunks.filter(Boolean);
}

async function translateChunk(text: string, from: string, to: string): Promise<string> {
  const sl = from === 'auto' ? 'auto' : from;
  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=${sl}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) throw new Error('TRANSLATE_FAILED');

  // Response shape: [ [ [translatedChunk, original, ...], ... ], null, detectedLang ]
  const data = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('TRANSLATE_FAILED');

  return (data[0] as [string, string][]).map((pair) => pair[0] ?? '').join('');
}

async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> {
  const sourceDef = LANGUAGES.find((l) => l.code === sourceLang);
  const targetDef = LANGUAGES.find((l) => l.code === targetLang);
  const chunks = chunkText(text);
  const translated: string[] = [];

  for (const chunk of chunks) {
    let result = chunk;

    if (sourceDef?.bridge) {
      result = await translateChunk(result, sourceLang, sourceDef.bridge);
      if (targetLang !== sourceDef.bridge) {
        result = await translateChunk(result, sourceDef.bridge, targetLang);
      }
    } else if (targetDef?.bridge) {
      result = await translateChunk(result, sourceLang, targetDef.bridge);
      result = await translateChunk(result, targetDef.bridge, targetLang);
    } else {
      result = await translateChunk(result, sourceLang, targetLang);
    }

    translated.push(result);
  }

  return translated.join('\n\n');
}

export async function POST(req: Request) {
  const { text, targetLang, sourceLang = 'auto' } = await req.json();
  if (!text || !targetLang) {
    return NextResponse.json({ error: 'Missing text or targetLang.' }, { status: 400 });
  }
  try {
    const translated = await translateText(text, sourceLang, targetLang);
    return NextResponse.json({ translated });
  } catch {
    return NextResponse.json({ error: 'Translation failed. Please try again.' }, { status: 500 });
  }
}
