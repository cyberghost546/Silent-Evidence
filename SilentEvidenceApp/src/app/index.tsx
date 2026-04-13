// app/index.tsx
// Home screen — shows the 20 latest ALL-rated anime stories fetched from the
// /api/app/stories endpoint. Supports pull-to-refresh. Tapping a card navigates
// to the native story reader. A "Sign in" banner appears at the top when the
// user is not logged in.

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiFetch, BASE_URL } from '@/lib/api';
import { getAuth } from '@/lib/auth';
import { BottomTabInset, Spacing } from '@/constants/theme';

// ── Types ────────────────────────────────────────────────────────────────────

// Shape of a story card as returned by GET /api/app/stories
type Story = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  views: number;
  mood: string | null;
  createdAt: string;
  category: { name: string; slug: string };
  author: { username: string; profile: { avatar: string | null } | null };
  _count: { likes: number; comments: number };
};

// ── Screen component ──────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  // Read the current auth state — null means the user is not signed in
  const auth = getAuth();

  const [stories, setStories]       = useState<Story[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  // Fetch the latest stories from the public API endpoint
  const loadStories = useCallback(async () => {
    setError('');
    try {
      const res  = await apiFetch('/api/app/stories');
      const json = await res.json();

      if (!res.ok) {
        // API returned an error object — surface the message
        setError(json.error ?? 'Could not load stories.');
        return;
      }
      setStories(json.stories);
    } catch {
      // Network failure or JSON parse error
      setError('Could not connect to server.');
    } finally {
      // Always clear the loading/refreshing spinners
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on first mount
  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // Called when the user drags to refresh the list
  const onRefresh = () => {
    setRefreshing(true);
    loadStories();
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#22c55e" size="large" />
      </SafeAreaView>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={loadStories}
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Main list ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={stories}
        keyExtractor={(item) => String(item.id)}
        // Pull-to-refresh support — tintColor matches the app's primary red
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22c55e"
          />
        }
        // Header renders the app title + optional guest sign-in banner
        ListHeaderComponent={
          <View>
            {/* App branding — "Anime Nexus" in red at the top */}
            <Text style={styles.headerTitle}>Anime Nexus</Text>

            {/* Sign-in banner — only shown when the user is not authenticated */}
            {!auth && (
              <Pressable
                style={({ pressed }) => [
                  styles.guestBanner,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => router.push('/login')}
              >
                <Text style={styles.guestBannerText}>
                  Sign in to follow writers and unlock your feed →
                </Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No stories yet. Check back soon.</Text>
          </View>
        }
        // Render each story as a tappable card
        renderItem={({ item }) => <StoryCard story={item} />}
        contentContainerStyle={[
          styles.list,
          // Extra bottom padding for the tab bar on Android (it doesn't auto-inset)
          Platform.OS === 'android' && { paddingBottom: BottomTabInset + Spacing.three },
        ]}
      />
    </SafeAreaView>
  );
}

// ── Story card component ──────────────────────────────────────────────────────

function StoryCard({ story }: { story: Story }) {
  const router = useRouter();

  // Format the publish date to a short readable string
  const date = new Date(story.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Fall back to a generated avatar if the author hasn't set one
  const authorAvatar =
    story.author.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=22c55e&color=fff&size=64`;

  // Resolve relative cover image paths to the full server URL
  const coverUri =
    story.coverImage
      ? story.coverImage.startsWith('http')
        ? story.coverImage
        : `${BASE_URL}${story.coverImage}`
      : null;

  return (
    // Tapping the card navigates to the native story reader
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
      onPress={() => router.push(`/story/${story.slug}`)}
    >
      {/* Cover image — only rendered when a URL is available */}
      {coverUri && (
        <Image
          source={{ uri: coverUri }}
          style={styles.cover}
          contentFit="cover"
        />
      )}

      <View style={styles.cardBody}>
        {/* Category badge — uppercase red label above the title */}
        <Text style={styles.categoryBadge}>
          {story.category.name.toUpperCase()}
        </Text>

        {/* Story title — up to 2 lines before truncating */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {story.title}
        </Text>

        {/* Author row — avatar + username */}
        <Pressable
          style={styles.authorRow}
          // Tap the author row to visit their profile without navigating away from home
          onPress={() => router.push(`/profile/${story.author.username}`)}
          hitSlop={8}
        >
          <Image
            source={{ uri: authorAvatar }}
            style={styles.authorAvatar}
            contentFit="cover"
          />
          <Text style={styles.authorName}>{story.author.username}</Text>
        </Pressable>

        {/* Excerpt — capped at 2 lines */}
        {story.excerpt ? (
          <Text style={styles.excerpt} numberOfLines={2}>
            {story.excerpt}
          </Text>
        ) : null}

        {/* Meta row — date, views, likes, comments */}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{date}</Text>
          <Text style={styles.meta}>👁 {story.views.toLocaleString()}</Text>
          <Text style={styles.meta}>♥ {story._count.likes.toLocaleString()}</Text>
          <Text style={styles.meta}>💬 {story._count.comments.toLocaleString()}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Screen background
  safe: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // Centered fallback (loading / error)
  centered: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },

  // FlatList container padding
  list: {
    paddingBottom: 40,
  },

  // "Anime Nexus" branding header
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#22c55e', // Signature red
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    letterSpacing: 0.5,
  },

  // Guest sign-in banner
  guestBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  guestBannerText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },

  // Individual story card
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    overflow: 'hidden',
  },

  // Cover image at the top of the card
  cover: {
    width: '100%',
    height: 160,
  },

  // Card text body below the image
  cardBody: {
    padding: 14,
    gap: 5,
  },

  // Red uppercase category badge
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: 1.2,
  },

  // Story title
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 22,
  },

  // Author avatar + name row
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  authorAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  authorName: {
    fontSize: 13,
    color: '#aaa',
    fontWeight: '600',
  },

  // Excerpt text
  excerpt: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 2,
  },

  // Stats row at the bottom of each card
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  meta: {
    fontSize: 12,
    color: '#555',
  },

  // Empty state
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#555',
    fontSize: 15,
    textAlign: 'center',
  },

  // Error state
  errorText: {
    color: '#22c55e',
    fontSize: 16,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
