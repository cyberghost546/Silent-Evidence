// lib/sanitize.ts
// Server-side HTML sanitizer for user-submitted story content.
// Strips dangerous tags/attributes (scripts, event handlers, iframes, etc.)
// while preserving everything a rich-text editor (TipTap) legitimately produces.

import sanitizeHtml from 'sanitize-html';

// Tags that TipTap's default schema can produce — allow all of them.
const ALLOWED_TAGS = [
  // Block elements
  'p',
  'br',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'div',
  'section',
  'article',
  // Inline elements
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'ins',
  'mark',
  'small',
  'sub',
  'sup',
  'span',
  'a',
  // Media
  'img',
  'figure',
  'figcaption',
  // Tables (TipTap table extension)
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
];

// Attributes that are safe for each allowed tag
const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['class', 'id'], // allow class/id on any element for styling
  a: ['href', 'target', 'rel', 'title'],
  img: ['src', 'alt', 'width', 'height', 'loading'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan', 'scope'],
  ol: ['start', 'type'],
  li: ['value'],
};

// Schemes allowed in href / src attributes — block javascript: and data: URIs
const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

// Raw-text / escapable-raw-text elements whose *contents* the HTML parser does
// not treat as normal markup. These are the source of the sanitize-html `xmp`
// bypass (advisory GHSA — "raw-text passthrough"): because the allowlist drops
// the tag but the parser had already swallowed its contents as raw text, crafted
// payloads could slip through on vulnerable versions.
//
// Listing them in `nonTextTags` tells sanitize-html to discard the element AND
// everything inside it, rather than lifting the inner text out. Combined with the
// patched library version (>= 2.17.5) this is defence in depth: even a future
// parser bug in one of these tags cannot leak content, because we never keep it.
const NON_TEXT_TAGS = [
  'script',
  'style',
  'textarea',
  'option',
  'noscript',
  'xmp',
  'noembed',
  'noframes',
  'title',
  'iframe',
];

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    // Discard these tags together with their contents (see NON_TEXT_TAGS above).
    nonTextTags: NON_TEXT_TAGS,
    // Drop, rather than escape, anything not on the allowlist, so stray markup
    // never survives as visible angle brackets either.
    disallowedTagsMode: 'discard',
    // Force all links to open in a new tab and add noopener for safety
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
  });
}
