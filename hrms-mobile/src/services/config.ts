import { Platform } from 'react-native';

/**
 * Backend URL resolution:
 * - EXPO_PUBLIC_API_URL wins (EAS / .env / LAN IP for physical devices)
 * - Android emulator cannot reach 127.0.0.1 → use 10.0.2.2
 * - iOS simulator / web → 127.0.0.1
 * Backend runs on :8000 (uvicorn main:app).
 */
function defaultUrl() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  return 'http://127.0.0.1:8000';
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultUrl();

/** Live API is now primary. Mocks remain only as offline fallback shapes. */
export const USE_MOCK = false;
