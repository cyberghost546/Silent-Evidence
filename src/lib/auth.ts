// lib/auth.ts
// Persistent auth store using expo-secure-store.
// Saves userId + username to encrypted device storage so the user stays
// logged in across app restarts — credentials are stored securely, not
// in plain-text AsyncStorage.

import * as SecureStore from 'expo-secure-store';

// Key used in SecureStore to store the auth JSON string
const AUTH_KEY = 'se_auth';

type Auth = { userId: number; username: string } | null;

// In-memory cache so we don't hit SecureStore on every API call
let _auth: Auth = null;

// Flag to track whether we've loaded from storage yet
let _loaded = false;

// Load auth from device storage into memory (called once at app start)
export async function loadAuth(): Promise<Auth> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_KEY);
    if (raw) {
      _auth = JSON.parse(raw);
    }
  } catch (err) {
    // If storage read fails, start fresh — don't crash the app
    console.warn('[auth] Failed to load from storage:', err);
  }
  _loaded = true;
  return _auth;
}

// Save after a successful login — writes to both memory and encrypted storage
export async function saveAuth(auth: { userId: number; username: string }) {
  _auth = auth;
  try {
    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(auth));
  } catch (err) {
    console.warn('[auth] Failed to save to storage:', err);
  }
}

// Read the current auth state (synchronous — uses in-memory cache)
export function getAuth(): Auth {
  return _auth;
}

// Whether loadAuth() has finished running
export function isAuthLoaded(): boolean {
  return _loaded;
}

// Clear on logout — removes from both memory and encrypted storage
export async function clearAuth() {
  _auth = null;
  try {
    await SecureStore.deleteItemAsync(AUTH_KEY);
  } catch (err) {
    console.warn('[auth] Failed to clear storage:', err);
  }
}
