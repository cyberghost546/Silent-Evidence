// app/profile/[username].tsx
// User profile screen — shows the user's avatar, bio, story count, follower count,
// a Follow/Unfollow button, and a list of their published stories.

import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiFetch, BASE_URL } from '@/lib/api';
import { getAuth } from '@/lib/auth';

// Shape of the user object returned by the API
type UserProfile = {
  id: number;
  username: string;
  bio: string | null;
  avatar: string;
  website: string | null;
  storyCount: number;
  followerCount: number;
  followingCount: number;
};

// Shape of a single story card
type Story = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  views: number;
  createdAt: string;
  category: { name: string; slug: string };
  _count: { likes: number; comments: number };
};

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const auth = getAuth(); // null if not logged in

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [isFollowing, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState('');

  // Load the profile and stories from the API
  const loadProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError('');

    try {
      const res = await apiFetch(`/api/app/user/${username}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Could not load profile.');
        return;
      }

      setProfile(json.user);
      setStories(json.stories);
      setFollowing(json.isFollowing);
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Toggle follow / unfollow
  const handleFollow = async () => {
    if (!auth) {
      // Redirect to the login screen if not signed in
      router.push('/login');
      return;
    }

    setFollowLoading(true);
    try {
      const res = await apiFetch(`/api/app/user/${username}/follow`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        // Update local state and adjust the follower count immediately
        setFollowing(json.following);
        setProfile((prev) =>
          prev ? { ...prev, followerCount: prev.followerCount + (json.following ? 1 : -1) } : prev
        );
      }
    } catch {
      // Silently fail — the user can try again
    } finally {
      setFollowLoading(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color="#22c55e" size="large" />
      </SafeAreaView>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error || !profile) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error || 'User not found.'}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Profile header (rendered above the stories list) ────────────────────
  const Header = (
    <View style={styles.header}>
      {/* Back button */}
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Text style={styles.backArrow}>←</Text>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      {/* Avatar + name */}
      <Image source={{ uri: profile.avatar }} style={styles.avatar} contentFit="cover" />
      <Text style={styles.username}>{profile.username}</Text>
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Stat label="Stories" value={profile.storyCount} />
        <Stat label="Followers" value={profile.followerCount} />
        <Stat label="Following" value={profile.followingCount} />
      </View>

      {/* Follow / Unfollow button — hidden if viewing your own profile */}
      {auth?.userId !== profile.id && (
        <Pressable
          onPress={handleFollow}
          disabled={followLoading}
          style={({ pressed }) => [
            styles.followBtn,
            isFollowing && styles.followingBtn,
            pressed && { opacity: 0.8 },
          ]}
        >
          {followLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.followBtnText}>{isFollowing ? 'Following' : 'Follow'}</Text>
          )}
        </Pressable>
      )}

      {/* Section title */}
      <Text style={styles.sectionTitle}>Stories by {profile.username}</Text>
    </View>
  );

  // ── Stories list ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={stories}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={Header}
        ListEmptyComponent={<Text style={styles.emptyText}>No published stories yet.</Text>}
        renderItem={({ item }) => <StoryCard story={item} />}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

// ── Stat block (number + label) ─────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Individual story card ────────────────────────────────────────────────────
function StoryCard({ story }: { story: Story }) {
  const date = new Date(story.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      {/* Cover image if available */}
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
        {/* Category badge */}
        <Text style={styles.category}>{story.category.name.toUpperCase()}</Text>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {story.title}
        </Text>

        {/* Excerpt */}
        {story.excerpt ? (
          <Text style={styles.excerpt} numberOfLines={2}>
            {story.excerpt}
          </Text>
        ) : null}

        {/* Meta row */}
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
    gap: 16,
  },
  list: { paddingBottom: 40 },

  // Header
  header: { padding: 20, alignItems: 'center', gap: 10 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 8,
  },
  backArrow: { color: '#22c55e', fontSize: 20 },
  backLabel: { color: '#22c55e', fontSize: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#2a2a2a' },
  username: { fontSize: 22, fontWeight: '700', color: '#fff' },
  bio: { fontSize: 14, color: '#888', textAlign: 'center', maxWidth: 280 },
  statsRow: { flexDirection: 'row', gap: 28, marginVertical: 4 },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: '#666' },

  // Follow button
  followBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 36,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  followingBtn: { backgroundColor: '#2a2a2a', borderWidth: 1, borderColor: '#444' },
  followBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Section title
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    alignSelf: 'flex-start',
    marginTop: 12,
  },

  // Story cards
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 140 },
  cardBody: { padding: 12, gap: 4 },
  category: { fontSize: 10, fontWeight: '700', color: '#22c55e', letterSpacing: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  excerpt: { fontSize: 13, color: '#666', lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  meta: { fontSize: 12, color: '#555' },

  // Error / empty
  errorText: { color: '#22c55e', fontSize: 16, textAlign: 'center' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 32, fontSize: 15 },
  backBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backBtnText: { color: '#fff', fontWeight: '600' },
});
