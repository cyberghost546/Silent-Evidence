import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent embedding in iframes (clickjacking protection)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Stop browsers from guessing content types
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Only send referrer on same origin
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features not needed by the site
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Force HTTPS for 1 year in production (with preload eligibility)
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]
    : []),
  // Content Security Policy — restricts which sources scripts, styles, and other
  // resources may be loaded from, dramatically reducing XSS attack surface.
  {
    key: 'Content-Security-Policy',
    value: [
      // Only allow scripts from this origin and Next.js inline scripts (nonces not used here)
      "default-src 'self'",
      // Scripts: self + unsafe-inline required by Next.js App Router hydration
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.pusher.com https://js.stripe.com",
      // Styles: self + unsafe-inline required by Tailwind and TipTap
      "style-src 'self' 'unsafe-inline'",
      // Images: self + data URIs + Unsplash CDN + UI Avatars + Picsum
      "img-src 'self' data: blob: https://images.unsplash.com https://source.unsplash.com https://ui-avatars.com https://picsum.photos",
      // Fonts: self only (no Google Fonts used)
      "font-src 'self'",
      // API / WebSocket connections: self + Pusher + Stripe
      "connect-src 'self' https://api.anthropic.com wss://*.pusher.com https://*.pusher.com https://api.stripe.com",
      // Frames: only Stripe (for payment elements)
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // Disallow all plugins (Flash, etc.)
      "object-src 'none'",
      // Disallow <base> tag hijacking
      "base-uri 'self'",
      // Only allow forms to submit to this origin
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // Required for Docker: outputs a self-contained server in .next/standalone
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
  // Allow Next.js <Image> to optimize images from these external domains.
  // Add any CDN or storage domains your cover images are hosted on.
  images: {
    remotePatterns: [
      // ui-avatars.com — used as fallback avatar generator
      { protocol: 'https', hostname: 'ui-avatars.com' },
      // picsum.photos — used for placeholder/seed images in development
      { protocol: 'https', hostname: 'picsum.photos' },
      // Localhost uploads in development
      { protocol: 'http', hostname: 'localhost' },
      // Add your production domain here e.g.:
      // { protocol: 'https', hostname: 'silentevidence.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
