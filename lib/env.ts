// lib/env.ts
// Validates that all required environment variables are present at startup.
// Import this file in app/layout.tsx (server component) so it runs once on boot.
// If a required variable is missing, the app throws immediately with a clear message
// instead of failing silently later with a cryptic error.

// ── Required variables ────────────────────────────────────────────────────────
// These MUST be set for the app to work at all.
const REQUIRED_VARS = [
  'DATABASE_URL',
  'NEXT_PUBLIC_BASE_URL',
  // Signs the session cookie so `userId` cannot be forged. Must be a long random
  // string (>= 32 chars). Generate with: openssl rand -hex 32
  'SESSION_SECRET',
] as const;

// ── Optional but warned variables ─────────────────────────────────────────────
// These are needed for specific features. Missing ones log a warning but don't crash.
const OPTIONAL_VARS: Record<string, string> = {
  ANTHROPIC_API_KEY:              'AI story generation and translation will be disabled.',
  STRIPE_SECRET_KEY:              'Stripe payments will not work.',
  STRIPE_WEBHOOK_SECRET:          'Stripe webhooks will not be validated.',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'Stripe frontend will not initialize.',
  STRIPE_PREMIUM_MONTHLY_PRICE_ID:'Monthly subscriptions will not work.',
  STRIPE_PREMIUM_YEARLY_PRICE_ID: 'Yearly subscriptions will not work.',
  STRIPE_AUTHOR_MONTHLY_PRICE_ID: 'Monthly Author Pro plans will not work.',
  STRIPE_AUTHOR_YEARLY_PRICE_ID:  'Yearly Author Pro plans will not work.',
  GOOGLE_CLIENT_ID:               'Google OAuth login will be disabled.',
  GOOGLE_CLIENT_SECRET:           'Google OAuth login will be disabled.',
  MICROSOFT_CLIENT_ID:            'Microsoft OAuth login will be disabled.',
  MICROSOFT_CLIENT_SECRET:        'Microsoft OAuth login will be disabled.',
  REDIS_URL:                      'Redis caching will be disabled — all requests hit the DB.',
  // The protected owner account (lib/owner.ts). Without it there is no owner to
  // protect from demotion and no target for break-glass recovery — the last-admin
  // guard still applies, but owner-specific protection is off.
  OWNER_EMAIL:                    'Owner-account protection and break-glass recovery will be disabled.',
  CRON_SECRET:                    'Scheduled jobs (publishing, retention, newsletter) cannot be triggered securely.',
};

// ── Validation function ───────────────────────────────────────────────────────
// Called once at startup. Safe to call multiple times (subsequent calls are no-ops).
let validated = false;

export function validateEnv(): void {
  // Only run once — avoids spamming logs on hot reload in dev
  if (validated) return;
  validated = true;

  const missing: string[] = [];

  // Check required variables — any missing one is a fatal error
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    // Throw so the app refuses to start rather than running in a broken state
    throw new Error(
      `[env] Missing required environment variables:\n` +
      missing.map((k) => `  - ${k}`).join('\n') +
      `\n\nCopy .env.example to .env and fill in the values.`
    );
  }

  // SESSION_SECRET strength. It signs every session cookie; a short or default
  // value would let an attacker forge sessions. Fail at boot rather than
  // discovering it only when the first cookie is signed. 32 hex chars = the
  // output of `openssl rand -hex 32` truncated is still 32; we require >= 32.
  const sessionSecret = process.env.SESSION_SECRET ?? '';
  if (sessionSecret.length < 32) {
    throw new Error(
      '[env] SESSION_SECRET must be at least 32 characters of random data. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }
  const WEAK_SECRETS = ['changeme', 'change-me', 'your-secret', 'placeholder', 'example'];
  if (WEAK_SECRETS.some((w) => sessionSecret.toLowerCase().includes(w))) {
    throw new Error('[env] SESSION_SECRET looks like a placeholder. Set a real random value.');
  }

  // Check optional variables — warn but don't crash
  for (const [key, hint] of Object.entries(OPTIONAL_VARS)) {
    const val = process.env[key];
    // Warn if missing OR if it looks like a placeholder (contains "YOUR_")
    if (!val || val.includes('YOUR_')) {
      console.warn(`[env] ${key} is not set — ${hint}`);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[env] Environment variables validated.');
  }
}
