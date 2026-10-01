/**
 * Expo Push registration + foreground handling.
 * Lazy-loaded: expo-notifications was removed from Expo Go (SDK 53+) and its
 * static import crashes the whole bundle there. Dev builds get full push;
 * Expo Go skips it gracefully and everything else keeps working.
 */
import { Platform } from 'react-native';
import { registerPushToken } from './api';

type NotificationsMod = typeof import('expo-notifications');

let cached: NotificationsMod | null | undefined;

async function notifs(): Promise<NotificationsMod | null> {
  if (cached !== undefined) return cached;
  try {
    const mod: NotificationsMod = await import('expo-notifications');
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cached = mod;
  } catch {
    cached = null; // Expo Go: push unavailable, carry on without it
  }
  return cached;
}

export async function setupPush(onTap?: (data: Record<string, unknown>) => void): Promise<string | null> {
  try {
    const { default: Device } = await import('expo-device');
    if (!Device.isDevice) return null;
    const N = await notifs();
    if (!N) return null;
    const { status: existing } = await N.getPermissionsAsync();
    const status = existing === 'granted' ? existing : (await N.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('hrms', {
        name: 'HRMS updates',
        importance: N.AndroidImportance.DEFAULT,
      });
    }
    const token = (await N.getExpoPushTokenAsync()).data;
    await registerPushToken(token);
    if (onTap) {
      N.addNotificationResponseReceivedListener((r) => {
        onTap((r.notification.request.content.data ?? {}) as Record<string, unknown>);
      });
    }
    return token;
  } catch {
    return null;
  }
}
