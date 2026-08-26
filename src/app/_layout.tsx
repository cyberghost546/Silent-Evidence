import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { loadAuth } from '@/lib/auth';

// Custom dark theme that matches the Silent Evidence aesthetic
// Overrides React Navigation's default dark colors with our brand palette
const SilentEvidenceDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#22c55e', // Blood red accent for active elements
    background: '#0a0a0a', // Near-black background
    card: '#1a1a1a', // Slightly lighter cards/headers
    border: '#2a2a2a', // Subtle dark borders
    notification: '#22c55e', // Red notification badge
  },
};

// Custom light theme (rarely used — horror readers prefer dark mode)
const SilentEvidenceLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#22c55e', // Keep the red accent in light mode too
  },
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [ready, setReady] = useState(false);

  // Load persisted auth from device storage before rendering the app
  // This ensures getAuth() returns the saved user immediately
  useEffect(() => {
    loadAuth().finally(() => setReady(true));
  }, []);

  // Don't render tabs until auth is loaded — prevents flicker on protected screens
  if (!ready) return null;

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? SilentEvidenceDarkTheme : SilentEvidenceLightTheme}
    >
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
