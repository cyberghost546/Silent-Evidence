// app/robots.ts — tells crawlers what they can/can't index
// Next.js serves this as /robots.txt automatically.

import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Allow all crawlers to index public content
        userAgent: '*',
        allow: '/',
        // Block private/admin/API paths from being indexed
        disallow: ['/admin/', '/api/', '/settings', '/messages', '/dashboard'],
      },
    ],
    // Point crawlers to the sitemap
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
