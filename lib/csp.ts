// lib/csp.ts
//
// Builds the Content-Security-Policy header. Kept in one place so the middleware
// (which owns the per-request nonce) and any tests agree on the exact policy.
//
// WHY A NONCE INSTEAD OF 'unsafe-inline'
// --------------------------------------
// The old CSP allowed `script-src 'unsafe-inline'`, which means the browser will
// run ANY inline <script> — including one an attacker manages to inject. That
// turns a single HTML-injection bug into script execution. A nonce flips this:
// only inline scripts carrying the exact per-request random nonce run, and the
// attacker cannot guess it (it changes every response). Injected script has no
// nonce, so the browser refuses to execute it even if it reaches the page.
//
// 'strict-dynamic' lets a trusted (nonced) script load further scripts — this is
// how Next.js's own bundle, and the Stripe/Pusher SDKs it loads, keep working
// without us having to allowlist their hosts by hand.
//
// PRODUCTION ONLY
// Dev keeps the looser policy: Next's dev server and Turbopack HMR rely on inline
// and eval'd scripts that would otherwise need constant nonce plumbing, and dev
// is not the security boundary. The strict policy applies only to production
// builds, which is what real users hit.

export interface CspResult {
  /** The header value. */
  value: string;
  /** Which header name to use — report-only enforces nothing, just reports. */
  headerName: 'Content-Security-Policy' | 'Content-Security-Policy-Report-Only';
}

/**
 * Builds the CSP for one request.
 *
 * @param nonce   Per-request random nonce (base64). Required in production.
 * @param isProd  Whether this is a production build.
 * @param reportOnly  When true, emit as report-only so violations are logged but
 *                    nothing is blocked — the safe way to trial a strict policy
 *                    in production before enforcing it. Driven by CSP_REPORT_ONLY.
 */
export function buildCsp(nonce: string, isProd: boolean, reportOnly = false): CspResult {
  // Script policy is the part that actually changed. In production we drop
  // 'unsafe-inline' entirely and trust only the nonce, plus strict-dynamic so
  // nonced scripts can pull in the bundles they need.
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`
    // Dev: Turbopack/HMR need inline + eval. Hosts kept for the external SDKs.
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.pusher.com https://js.stripe.com";

  const directives = [
    "default-src 'self'",
    scriptSrc,
    // Tailwind and many libraries inject inline styles; a style nonce is far more
    // fragile and style injection is not script execution, so inline styles stay.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com https://source.unsplash.com https://ui-avatars.com https://picsum.photos https://i.ytimg.com",
    "font-src 'self'",
    "connect-src 'self' https://api.anthropic.com wss://*.pusher.com https://*.pusher.com https://api.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Block this site from being framed anywhere (backs up X-Frame-Options).
    "frame-ancestors 'self'",
  ];

  return {
    value: directives.join('; '),
    headerName: reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
  };
}

/** Generates a per-request nonce. Uses Web Crypto so it works in the edge runtime. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
