import React, { createContext, useContext, useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import * as SplashScreen from 'expo-splash-screen';
import * as Location from 'expo-location';
import { Stack, router } from 'expo-router';
import { useColorScheme, AppState, AppStateStatus } from 'react-native';
import { getToken } from '@/services/auth';

// Prevent splash screen from auto-hiding until we load fonts/auth state
SplashScreen.preventAutoHideAsync();

interface AppStateContextProps {
  isAuthenticated: boolean | null;
  hasPermission: boolean | null;
  checkAuth: () => Promise<void>;
  checkPermission: () => Promise<void>;
  logout: () => void;
}

const AppStateContext = createContext<AppStateContextProps | undefined>(undefined);

export function useAppStateContext() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppStateContext must be used within AppStateProvider');
  }
  return context;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Load custom fonts (Space Grotesk, Inter, IBM Plex Mono)
  const [fontsLoaded] = useFonts({
    'SpaceGrotesk-Medium': SpaceGrotesk_500Medium,
    'SpaceGrotesk-Bold': SpaceGrotesk_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'IBMPlexMono-Regular': IBMPlexMono_400Regular,
    'IBMPlexMono-Medium': IBMPlexMono_500Medium,
    'IBMPlexMono-SemiBold': IBMPlexMono_600SemiBold,
  });

  const checkAuth = async () => {
    try {
      const token = await getToken();
      setIsAuthenticated(!!token);
    } catch (e) {
      setIsAuthenticated(false);
    }
  };

  const checkPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (e) {
      setHasPermission(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  // Run initial checks
  useEffect(() => {
    const init = async () => {
      await checkAuth();
      await checkPermission();
    };
    init();
  }, []);

  // Listen to app state changes (e.g. returning from settings) to re-evaluate permissions
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isAuthenticated) {
        await checkPermission();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Navigate dynamically based on auth & permission status
  useEffect(() => {
    if (!fontsLoaded) return;
    if (isAuthenticated === null || hasPermission === null) return;

    // Hide splash screen once fonts and state checks are complete
    SplashScreen.hideAsync();

    if (!isAuthenticated) {
      router.replace('/login');
    } else if (!hasPermission) {
      router.replace('/permission-request');
    } else {
      router.replace('/(tabs)');
    }
  }, [fontsLoaded, isAuthenticated, hasPermission]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppStateContext.Provider value={{ isAuthenticated, hasPermission, checkAuth, checkPermission, logout }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" options={{ gestureEnabled: false }} />
          <Stack.Screen name="permission-request" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        </Stack>
      </ThemeProvider>
    </AppStateContext.Provider>
  );
}
