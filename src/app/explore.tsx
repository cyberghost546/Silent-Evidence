// app/explore.tsx
// Explore screen — lets users search for stories and browse stories by mood.
// The search bar submits a query that opens the web search page in the browser.
// Mood tiles open the corresponding mood page on the website via Linking.openURL
// because there are no dedicated native mood screens yet.

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BASE_URL } from '@/lib/api';
import { BottomTabInset, Spacing } from '@/constants/theme';

// ── Mood data ─────────────────────────────────────────────────────────────────

// Each mood maps to a Prisma Mood enum value and an emoji for the tile
const MOODS = [
  { label: 'CREEPY',         emoji: '🕷️' },
  { label: 'PARANOID',       emoji: '👁️' },
  { label: 'DISTURBING',     emoji: '😱' },
  { label: 'ATMOSPHERIC',    emoji: '🌫️' },
  { label: 'PSYCHOLOGICAL',  emoji: '🧠' },
  { label: 'SUPERNATURAL',   emoji: '👻' },
  { label: 'GORE',           emoji: '🩸' },
  { label: 'JUMPSCARE',      emoji: '⚡' },
] as const;

// ── Screen component ──────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const router = useRouter();
  // Controlled value for the search input
  const [query, setQuery] = useState('');

  // Navigate to the native search screen when the user submits a query.
  // The search screen handles the actual API call — we just pass the query.
  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return; // Do nothing if the search box is empty
    // Push to the search screen with the query as a URL parameter
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  // Open the mood page on the website — native mood screens don't exist yet,
  // so we fall back to the web experience via Linking.openURL.
  const handleMoodPress = (mood: string) => {
    const url = `${BASE_URL}/mood/${mood.toLowerCase()}`;
    Linking.openURL(url).catch(() => {
      // If the URL can't be opened (e.g. no browser installed) fail silently
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          // Extra bottom padding for Android tab bar
          Platform.OS === 'android' && { paddingBottom: BottomTabInset + Spacing.three },
        ]}
        keyboardShouldPersistTaps="handled" // Keep the keyboard visible while tapping a result
      >
        {/* ── Screen title ───────────────────────────────────────────────── */}
        <Text style={styles.screenTitle}>Explore</Text>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <View style={styles.searchContainer}>
          {/* Search icon — plain text character for zero-dependency simplicity */}
          <Text style={styles.searchIcon}>🔍</Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search stories, authors, tags…"
            placeholderTextColor="#555"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch} // Fire search when the user hits Enter / Done
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Clear button — only visible when there is text in the input */}
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={10}
              style={styles.clearBtn}
            >
              <Text style={styles.clearBtnText}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Search submit button */}
        <Pressable
          style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.8 }]}
          onPress={handleSearch}
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>

        {/* ── Browse by mood section ─────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Browse by Mood</Text>
        <Text style={styles.sectionSubtitle}>
          Tap a mood to see matching stories on the web
        </Text>

        {/* 2-column grid of mood tiles */}
        <View style={styles.moodGrid}>
          {MOODS.map((mood) => (
            <Pressable
              key={mood.label}
              style={({ pressed }) => [
                styles.moodTile,
                pressed && styles.moodTilePressed,
              ]}
              onPress={() => handleMoodPress(mood.label)}
            >
              {/* Large emoji displayed prominently */}
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              {/* Mood name below the emoji */}
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Screen background
  safe: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // ScrollView inner padding
  scrollContent: {
    padding: 16,
    gap: 12,
  },

  // "Explore" heading
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },

  // Search input row — icon + input + clear button
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    // Remove default underline on Android
    ...(Platform.OS === 'android' && { paddingVertical: 8 }),
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: '#555',
    fontSize: 14,
  },

  // Red search submit button
  searchBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // Section heading above the mood grid
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
  },

  // 2-column grid wrapper
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Individual mood tile — takes up slightly less than half the screen width
  // so both columns have a small gap between them
  moodTile: {
    width: '47%',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  moodTilePressed: {
    backgroundColor: '#242424', // Slightly lighter on press to give tactile feedback
  },

  // Large centred emoji
  moodEmoji: {
    fontSize: 36,
  },

  // Mood name label below the emoji
  moodLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#aaa',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
