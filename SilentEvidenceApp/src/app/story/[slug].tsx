// app/story/[slug].tsx
// Story reader screen — fetches a single story by slug and renders it.
// The body HTML is displayed inside a react-native-webview with a dark theme
// applied so it matches the rest of the app. The header (above the WebView)
// shows the title, author, category, stats, and any content warnings.

import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { apiFetch, BASE_URL } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

// Full story object as returned by GET /api/app/stories/[slug]
type Story = {
  id: number;
  title: string;
  slug: string;
  content: string;           // Full HTML body — injected into the WebView
  excerpt: string | null;
  coverImage: string | null;
  views: number;
  mood: string | null;
  warnings: string | null;   // Yellow warning bar content
  hypeScore: number | null; // 1-10 AI hype score
  contentRating: string;
  createdAt: string;
  category: { name: string; slug: string };
  tags: { name: string; slug: string }[];
  author: {
    username: string;
    isVerified: boolean;
    profile: { avatar: string | null } | null;
  };
  _count: { likes: number; comments: number };
};

// ── Dark-themed HTML wrapper ──────────────────────────────────────────────────

// Wraps the story HTML body in a minimal dark page so the WebView looks native.
// - Background matches #0a0a0a (app background)
// - Text is off-white (#e5e5e5) for comfortable night reading
// - Images are capped to 100% width so they don't overflow on small screens
// - Font size 17px with 1.7 line-height for long-form prose readability
function buildHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <style>
    /* Reset and base dark theme */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: #0a0a0a;
      color: #e5e5e5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 17px;
      line-height: 1.7;
      padding: 16px;
      word-break: break-word;
    }

    /* Constrain all images so they don't bleed outside the viewport */
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      display: block;
      margin: 12px 0;
    }

    /* Paragraph spacing */
    p { margin-bottom: 1em; }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      color: #fff;
      margin-top: 1.4em;
      margin-bottom: 0.6em;
      line-height: 1.3;
    }

    /* Blockquotes — styled as pull-quotes */
    blockquote {
      border-left: 3px solid #22c55e;
      margin: 1em 0;
      padding: 8px 16px;
      color: #aaa;
      font-style: italic;
    }

    /* Inline code and pre blocks */
    code, pre {
      background: #1a1a1a;
      border-radius: 4px;
      padding: 2px 6px;
      font-family: monospace;
      font-size: 15px;
    }

    /* Links — red to match app primary */
    a { color: #22c55e; text-decoration: none; }

    /* Horizontal rules */
    hr { border: none; border-top: 1px solid #2a2a2a; margin: 1.5em 0; }
  </style>
</head>
<body>${content}</body>
</html>`;
}

// ── Screen component ──────────────────────────────────────────────────────────

export default function StoryScreen() {
  const { slug }  = useLocalSearchParams<{ slug: string }>();
  const router    = useRouter();
  // Ref lets us call scrollTo on the WebView imperatively (e.g. from the CTA button)
  const webViewRef = useRef<WebView>(null);

  const [story, setStory]     = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  // Track whether the WebView has finished loading so we can show a spinner
  const [webViewReady, setWebViewReady] = useState(false);

  // Fetch the story from the API
  const loadStory = useCallback(async () => {
    if (!slug) return;
    setError('');
    setLoading(true);

    try {
      const res  = await apiFetch(`/api/app/stories/${slug}`);
      const json = await res.json();

      if (!res.ok) {
        // Handles 404 and other API errors
        setError(json.error ?? 'Could not load story.');
        return;
      }
      setStory(json.story);
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadStory();
  }, [loadStory]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#22c55e" size="large" />
      </SafeAreaView>
    );
  }

  // ── Error / not found state ───────────────────────────────────────────────
  if (error || !story) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Story not found.'}</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Derived display values ─────────────────────────────────────────────────

  // Format publish date
  const publishDate = new Date(story.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Resolve author avatar — fall back to generated initials avatar
  const authorAvatar =
    story.author.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=22c55e&color=fff&size=64`;

  // Resolve cover image — relative paths need the base URL prepended
  const coverUri =
    story.coverImage
      ? story.coverImage.startsWith('http')
        ? story.coverImage
        : `${BASE_URL}${story.coverImage}`
      : null;

  // Build the HTML string that will be injected into the WebView
  const storyHtml = buildHtml(story.content);

  // Scroll the WebView back to the very top when the red CTA is pressed
  const scrollToTop = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript('window.scrollTo(0, 0); true;');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/*
        Layout: the header is a ScrollView so very long titles / tag lists
        don't get clipped. The WebView sits below it and takes up the
        remaining flex space. The red CTA is pinned at the very bottom.
      */}

      {/* ── Sticky back button row ──────────────────────────────────────── */}
      <View style={styles.navRow}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}
          hitSlop={10}
        >
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      {/* ── Story header (scrollable) ───────────────────────────────────── */}
      <ScrollView
        style={styles.headerScroll}
        contentContainerStyle={styles.headerContent}
        // Stop the header scroll from stealing swipes inside the WebView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {/* Cover image */}
        {coverUri && (
          <Image
            source={{ uri: coverUri }}
            style={styles.cover}
            contentFit="cover"
          />
        )}

        {/* Category badge */}
        <Text style={styles.categoryBadge}>
          {story.category.name.toUpperCase()}
        </Text>

        {/* Story title */}
        <Text style={styles.storyTitle}>{story.title}</Text>

        {/* Author row — avatar, name, verified tick, date */}
        <View style={styles.authorRow}>
          <Image
            source={{ uri: authorAvatar }}
            style={styles.authorAvatar}
            contentFit="cover"
          />
          <View style={styles.authorDetails}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{story.author.username}</Text>
              {/* Verified badge — only shown for verified authors */}
              {story.author.isVerified && (
                <Text style={styles.verifiedBadge}>✓</Text>
              )}
            </View>
            <Text style={styles.publishDate}>{publishDate}</Text>
          </View>
        </View>

        {/* Stats row — views, likes, comments */}
        <View style={styles.statsRow}>
          <Text style={styles.stat}>👁 {story.views.toLocaleString()}</Text>
          <Text style={styles.stat}>♥ {story._count.likes.toLocaleString()}</Text>
          <Text style={styles.stat}>💬 {story._count.comments.toLocaleString()}</Text>
          {/* Scare score — only shown when the AI has rated the story */}
          {story.hypeScore !== null && (
            <Text style={styles.stat}>💀 {story.hypeScore}/10</Text>
          )}
        </View>

        {/* Tags — shown as small pill chips below the stats */}
        {story.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {story.tags.map((tag) => (
              <View key={tag.slug} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Content warning bar — yellow strip shown when warnings are present */}
        {story.warnings ? (
          <View style={styles.warningBar}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>{story.warnings}</Text>
          </View>
        ) : null}

        {/* Divider between header and story body */}
        <View style={styles.divider} />
      </ScrollView>

      {/* ── Story body WebView ──────────────────────────────────────────── */}
      {/*
        The WebView receives the full dark-themed HTML string directly via
        `source={{ html }}` — no network request is made from the WebView.
        This is faster and avoids CORS issues on the app.
      */}
      <View style={styles.webViewContainer}>
        {/* Spinner shown while the WebView is rendering the HTML */}
        {!webViewReady && (
          <View style={styles.webViewLoading}>
            <ActivityIndicator color="#22c55e" />
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ html: storyHtml }}
          style={styles.webView}
          // Disable all external navigation — the content is self-contained
          onShouldStartLoadWithRequest={(request) => {
            // Allow the initial about:blank / data: load but block all external URLs
            return request.url === 'about:blank' || request.url.startsWith('data:');
          }}
          // Mark the WebView as ready once the DOM has loaded
          onLoad={() => setWebViewReady(true)}
          // Shared cookies and JavaScript are not needed — the content is static
          javaScriptEnabled={false}
          domStorageEnabled={false}
          // Matches the app background so there's no white flash on load
          backgroundColor="#0a0a0a"
          // Allow the iOS WebView to scale the page on double-tap
          scalesPageToFit={Platform.OS === 'android'}
        />
      </View>

      {/* ── Bottom CTA — "Read" button ──────────────────────────────────── */}
      {/*
        Scrolls the WebView back to the top so the reader can re-read from
        the beginning without manually scrolling all the way up.
      */}
      <View style={styles.ctaBar}>
        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.85 }]}
          onPress={scrollToTop}
        >
          <Text style={styles.ctaBtnText}>↑ Back to Top</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Full-screen dark background
  safe: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // Centered fallback for loading / error states
  centered: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },

  // Back navigation row pinned at the top
  navRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backArrow: {
    color: '#22c55e',
    fontSize: 20,
  },
  backLabel: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },

  // Scrollable header area above the WebView
  headerScroll: {
    flexGrow: 0,          // Do not expand to fill remaining height — the WebView does that
    maxHeight: '45%',     // Give the header at most 45% of the screen so the body is visible
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },

  // Cover image
  cover: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 4,
  },

  // Category badge
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: 1.2,
  },

  // Story title
  storyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 28,
  },

  // Author identity row
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  authorDetails: {
    gap: 2,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  // Verified checkmark — shown next to the author's name
  verifiedBadge: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '700',
  },
  publishDate: {
    fontSize: 12,
    color: '#555',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  stat: {
    fontSize: 13,
    color: '#666',
  },

  // Tags row
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#888',
  },

  // Yellow content warning bar
  warningBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#2a2200',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    borderRadius: 8,
    padding: 10,
  },
  warningIcon: {
    fontSize: 15,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#f59e0b',
    lineHeight: 18,
  },

  // Thin divider line between header and body
  divider: {
    height: 1,
    backgroundColor: '#1f1f1f',
    marginVertical: 4,
  },

  // WebView container — fills all remaining vertical space
  webViewContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  // Spinner overlay while the HTML is rendering
  webViewLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // Bottom CTA bar
  ctaBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  ctaBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // Error state buttons
  errorText: {
    color: '#22c55e',
    fontSize: 16,
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
