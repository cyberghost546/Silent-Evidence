// tests/sanitize.test.ts
// Tests for lib/sanitize.ts — the sole defence against stored XSS in user content.
//
// This is the highest-stakes code in the app: every story body and comment passes
// through sanitizeContent before it is stored and later rendered with
// dangerouslySetInnerHTML. A gap here is stored XSS against every reader. These
// tests pin the known attack shapes closed, including the `xmp` raw-text
// passthrough that a recent sanitize-html advisory was about.

import { describe, it, expect } from 'vitest';
import { sanitizeContent } from '@/lib/sanitize';

describe('sanitizeContent — script execution vectors', () => {
  it('strips <script> and its contents', () => {
    const out = sanitizeContent('<p>hi</p><script>alert(1)</script>');
    expect(out).not.toMatch(/script/i);
    expect(out).not.toContain('alert');
  });

  it('strips inline event handlers', () => {
    const out = sanitizeContent('<p onclick="alert(1)">hi</p><img src=x onerror="alert(1)">');
    expect(out).not.toMatch(/onclick/i);
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toContain('alert');
  });

  it('removes javascript: URLs', () => {
    const out = sanitizeContent('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toMatch(/javascript:/i);
  });

  it('removes data: URLs in images', () => {
    const out = sanitizeContent('<img src="data:text/html,<script>alert(1)</script>">');
    expect(out).not.toMatch(/data:/i);
    expect(out).not.toContain('alert');
  });

  it('drops iframes entirely', () => {
    const out = sanitizeContent('<iframe src="https://evil.example"></iframe>');
    expect(out).not.toMatch(/iframe/i);
    expect(out).not.toContain('evil.example');
  });
});

describe('sanitizeContent — raw-text passthrough (the xmp bypass)', () => {
  // The advisory: content inside raw-text elements like <xmp>, <noscript>,
  // <noembed>, <title> was lifted out as text on vulnerable versions, smuggling
  // markup past the allowlist. NON_TEXT_TAGS must discard the contents wholesale.
  it.each(['xmp', 'noscript', 'noembed', 'noframes', 'title', 'textarea', 'style'])(
    'discards the contents of <%s>',
    (tag) => {
      const out = sanitizeContent(`<${tag}><img src=x onerror=alert(1)></${tag}>`);
      expect(out).not.toContain('onerror');
      expect(out).not.toContain('alert');
      expect(out.toLowerCase()).not.toContain(`<${tag}`);
    },
  );

  it('does not leak a smuggled script through xmp', () => {
    const out = sanitizeContent('<xmp></xmp><script>alert(document.cookie)</script>');
    expect(out).not.toContain('alert');
    expect(out).not.toContain('document.cookie');
  });
});

describe('sanitizeContent — legitimate content survives', () => {
  it('keeps ordinary rich text', () => {
    const html = '<p>A <strong>dark</strong> and <em>stormy</em> night.</p><ul><li>one</li></ul>';
    expect(sanitizeContent(html)).toBe(html);
  });

  it('keeps allowed links but forces safe rel/target', () => {
    const out = sanitizeContent('<a href="https://example.com">link</a>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('keeps images with http(s) sources', () => {
    const out = sanitizeContent('<img src="https://images.example/x.jpg" alt="x">');
    expect(out).toContain('src="https://images.example/x.jpg"');
    expect(out).toContain('alt="x"');
  });

  it('keeps tables produced by the editor', () => {
    const html = '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>';
    expect(sanitizeContent(html)).toBe(html);
  });
});
