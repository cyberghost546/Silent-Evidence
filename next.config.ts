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
  // Force HTTPS for 1 year in production
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
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
      // { protocol: 'https', hostname: 'animenexus.com' },
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
