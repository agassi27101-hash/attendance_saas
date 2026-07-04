import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    // Dynamic require to prevent bundling native secure store on web
    const SecureStore = require('expo-secure-store');
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(TOKEN_KEY);
  } else {
    try {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.warn('SecureStore read failed:', e);
      return null;
    }
  }
}

export async function deleteToken(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    const SecureStore = require('expo-secure-store');
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
