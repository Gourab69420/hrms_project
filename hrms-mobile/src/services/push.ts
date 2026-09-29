/** Expo Push registration + foreground handling. Backend sends via /auth/push-token registry. */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerPushToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function setupPush(onTap?: (data: Record<string, unknown>) => void): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    const status =
      existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('hrms', {
        name: 'HRMS updates',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await registerPushToken(token);
    if (onTap) {
      Notifications.addNotificationResponseReceivedListener((r) => {
        onTap((r.notification.request.content.data ?? {}) as Record<string, unknown>);
      });
    }
    return token;
  } catch {
    return null;
  }
}
