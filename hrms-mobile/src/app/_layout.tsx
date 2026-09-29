import {
  IBMPlexSans_400Regular,
  IBMPlexSans_400Regular_Italic,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth, AuthProvider } from '../store/AuthContext';
import { lockEnabled, unlock } from '../services/applock';
import { flushPunches, watchConnectivity } from '../services/offlineQueue';
import { setupPush } from '../services/push';
import { colors, fonts } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000 },
  },
});

// React Query respects real connectivity (offline punch queue flushes on reconnect).
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((s) => setOnline(!!s.isConnected)),
);

/** Post-login wiring: push registration, offline flush, app-lock on foreground. */
function Wiring() {
  const { user } = useAuth();
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!user) return;
    setupPush((data) => {
      if (data.type === 'leave' || data.type === 'regularization') {
        queryClient.invalidateQueries();
        router.push(data.type === 'leave' ? '/(employee)/leaves' : '/(employee)/regularization');
      }
    }).catch(() => {});
    flushPunches()
      .then((r) => {
        if (r.flushed > 0) queryClient.invalidateQueries();
      })
      .catch(() => {});
    const unsub = watchConnectivity(() => {
      flushPunches()
        .then((r) => {
          if (r.flushed > 0) queryClient.invalidateQueries();
        })
        .catch(() => {});
    });
    return unsub;
  }, [user?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      if (
        appState.current.match(/inactive|background/) &&
        next === 'active' &&
        user &&
        (await lockEnabled())
      ) {
        setLocked(true);
        const ok = await unlock();
        if (ok) setLocked(false);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [user?.id]);

  const retryUnlock = useCallback(async () => {
    if (await unlock()) setLocked(false);
  }, []);

  if (!locked) return null;
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.navy,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}>
      <Text style={{ color: '#FFF', fontFamily: fonts.display, fontSize: 20 }}>HRMS locked</Text>
      <Pressable
        onPress={retryUnlock}
        style={{ backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 }}>
        <Text style={{ color: colors.navy, fontFamily: fonts.display, fontSize: 15 }}>Unlock</Text>
      </Pressable>
    </View>
  );
}

/** Root: fonts -> query cache -> auth. Splash stays until Sora + Plex are ready (no FOUT). */
export default function RootLayout() {
  const [loaded] = useFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_400Regular_Italic,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator size="large" color={colors.navy} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(employee)" />
        </Stack>
        <Wiring />
      </AuthProvider>
    </QueryClientProvider>
  );
}
