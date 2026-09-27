// app/notifications.tsx
// Notifications screen — shows the user's activity feed (likes, comments, follows, etc.)
// Requires authentication — prompts sign-in if not logged in.
// Pulls from GET /api/app/notifications which returns recent notifications.

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
import { useFocusEffect } from '@react-navigation/native';

import { apiFetch } from '@/lib/api';
import { getAuth } from '@/lib/auth';
import { BottomTabInset } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────────────────────

type Notification = {
  id: number;
  type: string; // COMMENT, REPLY, LIKE, FOLLOW, MENTION, COLLABORATE, DIRECT_MESSAGE, GROUP_INVITE
  message: string;
  read: boolean;
  createdAt: string;
  storyId: number | null;
  story: { slug: string } | null;
};

// Map notification types to emoji icons for visual distinction
const TYPE_ICONS: Record<string, string> = {
  COMMENT: '💬',
  REPLY: '↩️',
  LIKE: '❤️',
  FOLLOW: '👤',
  MENTION: '@',
  COLLABORATE: '✍️',
  DIRECT_MESSAGE: '📩',
  GROUP_INVITE: '👥',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const auth = getAuth();

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load notifications and mark them as read on the server
  const loadNotifications = useCallback(async () => {
    try {
      const res = await apiFetch('/api/app/notifications');
      if (res.ok) {
        const json = await res.json();
        setItems(json);
      }
    } catch {
      // Network error — keep existing items
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload each time the user navigates to this tab
  useFocusEffect(
    useCallback(() => {
      if (auth) loadNotifications();
      else setLoading(false);
    }, [auth, loadNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  // Navigate to the relevant story when a notification is tapped
  const handleTap = (item: Notification) => {
    if (item.story?.slug) {
      router.push(`/story/${item.story.slug}`);
    }
  };

  // Format relative time (e.g. "2h ago", "3d ago")
  const timeAgo = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!auth) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Stay in the loop</Text>
          <Text style={styles.emptyText}>Sign in to see likes, comments, and follows.</Text>
          <Pressable style={styles.signInBtn} onPress={() => router.push('/login')}>
            <Text style={styles.signInText}>Sign in</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.header}>Notifications</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'android' ? BottomTabInset + 16 : 16,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              When someone likes, comments, or follows you, it will show up here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, !item.read && styles.rowUnread]}
            onPress={() => handleTap(item)}
          >
            {/* Notification type icon */}
            <Text style={styles.icon}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>

            <View style={styles.rowBody}>
              <Text style={styles.message} numberOfLines={2}>
                {item.message}
              </Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>

            {/* Unread indicator dot */}
            {!item.read && <View style={styles.dot} />}
          </Pressable>
        )}
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

  // Notification row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  rowUnread: {
    // Subtle red tint on unread notifications so they stand out
    backgroundColor: 'rgba(220, 38, 38, 0.06)',
  },
  icon: { fontSize: 24, marginRight: 12, width: 32, textAlign: 'center' },
  rowBody: { flex: 1 },
  message: { color: '#fff', fontSize: 14, lineHeight: 20 },
  time: { color: '#555', fontSize: 12, marginTop: 2 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginLeft: 8,
  },
});
