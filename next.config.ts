import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

// Run `ANALYZE=true npm run build` to open the interactive bundle treemap.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const isProd = process.env.NODE_ENV === 'production';

const securityHeaders = [
  // Prevent embedding in iframes (clickjacking protection)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Stop browsers from guessing content types
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Only send referrer on same origin
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features not needed by the site
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Prevent this page from sharing a browsing context group with cross-origin openers
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // Disable DNS prefetching to avoid leaking visited URLs
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // Force HTTPS for 1 year in production (with preload eligibility)
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]
    : []),
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // unsafe-eval is only needed by Next.js dev mode — strip it from production
      isProd
        ? "script-src 'self' 'unsafe-inline' https://js.pusher.com https://js.stripe.com"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.pusher.com https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://images.unsplash.com https://source.unsplash.com https://ui-avatars.com https://picsum.photos https://i.ytimg.com",
      "font-src 'self'",
      // api.anthropic.com is called server-side only — kept here for browser fetch fallback
      "connect-src 'self' https://api.anthropic.com wss://*.pusher.com https://*.pusher.com https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // Allow Next.js <Image> to optimize images from these external domains.
  // Add any CDN or storage domains your cover images are hosted on.
  images: {
    remotePatterns: [
      // ui-avatars.com — used as fallback avatar generator
      { protocol: 'https', hostname: 'ui-avatars.com' },
      // picsum.photos — used for placeholder/seed images in development
      { protocol: 'https', hostname: 'picsum.photos' },
      // Unsplash — used for story cover images and slideshow backgrounds
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
      // Localhost uploads in development
      { protocol: 'http', hostname: 'localhost' },
      // YouTube thumbnail CDN — used by VideoCard and AddVideoButton
      { protocol: 'https', hostname: 'i.ytimg.com' },
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

export default withBundleAnalyzer(nextConfig);
