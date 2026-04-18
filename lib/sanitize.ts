// lib/sanitize.ts
// Server-side HTML sanitizer for user-submitted story content.
// Strips dangerous tags/attributes (scripts, event handlers, iframes, etc.)
// while preserving everything a rich-text editor (TipTap) legitimately produces.

import sanitizeHtml from 'sanitize-html';

// Tags that TipTap's default schema can produce — allow all of them.
const ALLOWED_TAGS = [
  // Block elements
  'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'div', 'section', 'article',
  // Inline elements
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'mark', 'small', 'sub', 'sup',
  'span', 'a',
  // Media
  'img', 'figure', 'figcaption',
  // Tables (TipTap table extension)
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
];

// Attributes that are safe for each allowed tag
const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['class', 'id'],          // allow class/id on any element for styling
  'a': ['href', 'target', 'rel', 'title'],
  'img': ['src', 'alt', 'width', 'height', 'loading'],
  'td': ['colspan', 'rowspan'],
  'th': ['colspan', 'rowspan', 'scope'],
  'ol': ['start', 'type'],
  'li': ['value'],
};

// Schemes allowed in href / src attributes — block javascript: and data: URIs
const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    // Force all links to open in a new tab and add noopener for safety
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
  });
}
