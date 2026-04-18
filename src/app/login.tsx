// app/login.tsx
// Login screen — lets the user sign in with their Silent Evidence account.
// On success it saves the userId+username to the in-memory auth store
// and navigates back to wherever they came from.

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiFetch } from '@/lib/api';
import { saveAuth } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res  = await apiFetch('/api/app/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();

      if (!res.ok) {
        // Show the server error (e.g. "Invalid email or password.")
        setError(json.error ?? 'Login failed.');
        return;
      }

      // Store the userId and username so all future requests are authenticated
      // Uses AsyncStorage so the user stays logged in across app restarts
      await saveAuth({ userId: json.userId, username: json.username });

      // Go back to the previous screen (or home if there's no history)
      router.canGoBack() ? router.back() : router.replace('/');
    } catch {
      setError('Could not connect to server. Check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Title */}
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Use your Silent Evidence account</Text>

        {/* Email field */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#555"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {/* Password field */}
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#555"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Error message */}
        {!!error && <Text style={styles.error}>{error}</Text>}

        {/* Submit button */}
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>

        {/* Cancel */}
        <Pressable onPress={() => router.canGoBack() && router.back()} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
  },
  error: {
    color: '#22c55e',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    color: '#666',
    fontSize: 14,
  },
});
