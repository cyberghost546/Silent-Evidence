// app/sitemap.ts — auto-generated sitemap for Google/Bing indexing
// Next.js reads this file and serves /sitemap.xml automatically.

import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

// Replace with your actual domain
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://silentevidence.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all published stories (slug + updatedAt for changefreq hint)
  const stories = await prisma.story.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000, // sitemap limit safety cap
  });

  // Fetch all user profiles
  const users = await prisma.user.findMany({
    select: { username: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  });

  // Fetch all categories
  const categories = await prisma.category.findMany({
    select: { slug: true },
  });

  // Static pages
  const statics: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Story pages — high priority, changes frequently
  const storyUrls: MetadataRoute.Sitemap = stories.map(s => ({
    url: `${BASE_URL}/story/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // User profile pages
  const userUrls: MetadataRoute.Sitemap = users.map(u => ({
    url: `${BASE_URL}/user/${u.username}`,
    lastModified: u.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  // Category pages
  const categoryUrls: MetadataRoute.Sitemap = categories.map(c => ({
    url: `${BASE_URL}/category/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [...statics, ...storyUrls, ...userUrls, ...categoryUrls];
}
