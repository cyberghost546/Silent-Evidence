// lib/notifications.ts
// Push notification registration for Expo.
// Requests permission, gets an Expo Push Token, and sends it to the backend
// so the server can deliver notifications to this device.

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from './api';

// Configure how notifications appear when the app is in the foreground:
// Show the alert, play the sound, and show the badge count
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register this device for push notifications and save the token on the server.
// Call this after the user logs in so we can associate the token with their account.
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices, not simulators
  if (!Device.isDevice) {
    console.log('[notifications] Push notifications require a physical device.');
    return null;
  }

  // Check if we already have permission, and request it if not
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // User denied notification permission — respect their choice
  if (finalStatus !== 'granted') {
    console.log('[notifications] Permission not granted.');
    return null;
  }

  // Get the Expo Push Token (works with Expo's push service)
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Android requires a notification channel for heads-up notifications
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22c55e', // Red LED notification light
    });
  }

  // Send the token to our backend so it can push notifications to this device
  try {
    await apiFetch('/api/app/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch (err) {
    console.warn('[notifications] Failed to register token with server:', err);
  }

  return token;
}
