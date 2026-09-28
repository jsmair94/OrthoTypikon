import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { PreferencesProvider, useI18n, usePreferences } from '@/hooks/usePreferences';
import { HymnPlayerProvider } from '@/hooks/useHymnPlayer';
import { configurePrayerCommunityApi } from '@/lib/prayerCommunitySession';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
configurePrayerCommunityApi();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { t } = useI18n();
  const { preferencesLoaded, hasCompletedSetup } = usePreferences();
  if (!preferencesLoaded) return null;

  return (
    <Stack screenOptions={{ headerBackTitle: t.notFound.back }}>
      <Stack.Protected guard={!hasCompletedSetup}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={hasCompletedSetup}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="prayer" options={{ headerShown: false }} />
        <Stack.Screen name="compass" options={{ headerShown: false }} />
        <Stack.Screen name="fasting" options={{ headerShown: false }} />
        <Stack.Screen name="learn" options={{ headerShown: false }} />
        <Stack.Screen name="pastoral" options={{ headerShown: false }} />
        <Stack.Screen name="news" options={{ headerShown: false }} />
        <Stack.Screen name="widget" options={{ headerShown: false }} />
        <Stack.Screen name="prayer-mode" options={{ headerShown: false }} />
        <Stack.Screen name="info/[section]" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  // Expo web can hang in FontFaceObserver while loading bundled Google fonts.
  // The app does not assign a custom font family, so use the platform font on web.
  const [fontsLoaded, fontError] = useFonts(
    Platform.OS === 'web'
      ? {}
      : {
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
        },
  );

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView>
              <KeyboardProvider>
                <HymnPlayerProvider>
                  <RootLayoutNav />
                </HymnPlayerProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
