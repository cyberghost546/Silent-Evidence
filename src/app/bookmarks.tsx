// app/bookmarks.tsx
// Bookmarks screen — shows stories the user has saved for later.
// Requires authentication — prompts sign-in if not logged in.
// Pulls from GET /api/app/bookmarks which returns saved stories.

import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';

import { apiFetch, BASE_URL } from '@/lib/api';
import { getAuth } from '@/lib/auth';
import { BottomTabInset } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

type BookmarkedStory = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  createdAt: string;
  author: { username: string; profile: { avatar: string | null } | null };
  category: { name: string };
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function BookmarksScreen() {
  const router = useRouter();
  const auth = getAuth();

  const [stories, setStories] = useState<BookmarkedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load bookmarks whenever the screen comes into focus
  const loadBookmarks = useCallback(async () => {
    try {
      const res = await apiFetch('/api/app/bookmarks');
      if (res.ok) {
        const json = await res.json();
        setStories(json);
      }
    } catch {
      // Network error — leave existing list in place
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload bookmarks each time the user navigates to this tab
  useFocusEffect(
    useCallback(() => {
      if (auth) loadBookmarks();
      else setLoading(false);
    }, [auth, loadBookmarks])
  );

  // Pull-to-refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    loadBookmarks();
  };

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!auth) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔖</Text>
          <Text style={styles.emptyTitle}>Save stories for later</Text>
          <Text style={styles.emptyText}>Sign in to bookmark your favorite horror stories.</Text>
          <Pressable style={styles.signInBtn} onPress={() => router.push('/login')}>
            <Text style={styles.signInText}>Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render bookmark list ──────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.header}>Bookmarks</Text>
      <FlatList
        data={stories}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'android' ? BottomTabInset + 16 : 16,
          paddingHorizontal: 16,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
        // Empty state when user has no bookmarks yet
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🔖</Text>
            <Text style={styles.emptyTitle}>No bookmarks yet</Text>
            <Text style={styles.emptyText}>
              Tap the bookmark icon on any story to save it here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          // Resolve cover image — relative paths need the base URL prepended
          const cover = item.coverImage
            ? item.coverImage.startsWith('http')
              ? item.coverImage
              : `${BASE_URL}${item.coverImage}`
            : null;

          return (
            <Pressable style={styles.card} onPress={() => router.push(`/story/${item.slug}`)}>
              {cover && <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" />}
              <View style={styles.cardBody}>
                <Text style={styles.category}>{item.category.name}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.excerpt && (
                  <Text style={styles.excerpt} numberOfLines={2}>
                    {item.excerpt}
                  </Text>
                )}
                <Text style={styles.author}>by {item.author.username}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 6 },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  signInBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  signInText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  // Story card
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cover: { width: '100%', height: 160 },
  cardBody: { padding: 14 },
  category: { color: '#22c55e', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  excerpt: { color: '#aaa', fontSize: 13, marginBottom: 6, lineHeight: 18 },
  author: { color: '#666', fontSize: 12 },
});
