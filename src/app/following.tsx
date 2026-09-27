// app/following.tsx
// Following feed tab — shows the latest stories from users the logged-in
// user follows. If not logged in, prompts them to sign in.

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

// Shape of a story card in the following feed
type Story = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  views: number;
  createdAt: string;
  category: { name: string };
  author: { username: string; profile: { avatar: string | null } | null };
  _count: { likes: number; comments: number };
};

export default function FollowingScreen() {
  const router = useRouter();
  const auth = getAuth();

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Fetch the following feed from the API
  const loadFeed = useCallback(async () => {
    setError('');
    try {
      const res = await apiFetch('/api/app/following/feed');
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Could not load feed.');
        return;
      }
      setStories(json.stories);
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch if logged in
    if (auth) loadFeed();
    else setLoading(false);
  }, [auth, loadFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  // ── Not logged in ────────────────────────────────────────────────────────
  if (!auth) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.guestTitle}>See new stories first</Text>
        <Text style={styles.guestSub}>
          Follow your favourite writers and their latest stories will appear here.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.signInBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.signInBtnText}>Sign in</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#22c55e" size="large" />
      </SafeAreaView>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={loadFeed} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Feed list ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={stories}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
        ListHeaderComponent={<Text style={styles.feedTitle}>Following</Text>}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptySub}>
              Follow writers from their profiles and their new stories will show up here.
            </Text>
          </View>
        }
        renderItem={({ item }) => <StoryCard story={item} />}
        contentContainerStyle={[
          styles.list,
          // Extra bottom padding for the tab bar on Android
          Platform.OS === 'android' && { paddingBottom: BottomTabInset + Spacing.three },
        ]}
      />
    </SafeAreaView>
  );
}

// ── Individual story card ────────────────────────────────────────────────────
function StoryCard({ story }: { story: Story }) {
  const router = useRouter();
  const date = new Date(story.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Resolve the author's avatar URL
  const authorAvatar =
    story.author.profile?.avatar ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(story.author.username)}&background=22c55e&color=fff&size=64`;

  return (
    <View style={styles.card}>
      {/* Cover image */}
      {story.coverImage && (
        <Image
          source={{
            uri: story.coverImage.startsWith('http')
              ? story.coverImage
              : `${BASE_URL}${story.coverImage}`,
          }}
          style={styles.cover}
          contentFit="cover"
        />
      )}

      <View style={styles.cardBody}>
        {/* Author row — tapping navigates to their profile */}
        <Pressable
          style={styles.authorRow}
          onPress={() => router.push(`/profile/${story.author.username}`)}
        >
          <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} contentFit="cover" />
          <Text style={styles.authorName}>{story.author.username}</Text>
        </Pressable>

        {/* Category + title */}
        <Text style={styles.category}>{story.category.name.toUpperCase()}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {story.title}
        </Text>

        {/* Excerpt */}
        {story.excerpt ? (
          <Text style={styles.excerpt} numberOfLines={2}>
            {story.excerpt}
          </Text>
        ) : null}

        {/* Meta */}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{date}</Text>
          <Text style={styles.meta}>👁 {story.views.toLocaleString()}</Text>
          <Text style={styles.meta}>♥ {story._count.likes}</Text>
          <Text style={styles.meta}>💬 {story._count.comments}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0a' },
  centered: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  list: { paddingBottom: 40 },

  // Feed header
  feedTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  // Cards
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 160 },
  cardBody: { padding: 14, gap: 5 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  authorAvatar: { width: 28, height: 28, borderRadius: 14 },
  authorName: { fontSize: 13, color: '#aaa', fontWeight: '600' },
  category: { fontSize: 10, fontWeight: '700', color: '#22c55e', letterSpacing: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  excerpt: { fontSize: 13, color: '#666', lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  meta: { fontSize: 12, color: '#555' },

  // Guest / empty states
  guestTitle: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center' },
  guestSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  signInBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  signInBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  emptyContainer: { padding: 32, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  emptySub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },

  // Error state
  errorText: { color: '#22c55e', fontSize: 16, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});
