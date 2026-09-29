/** Offline punch queue: taps made without network are retried on reconnect. */
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const KEY = 'hrms_pending_punches';

async function read(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function write(v: string[]) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export async function queuePunch(): Promise<void> {
  const q = await read();
  q.push(new Date().toISOString());
  await write(q);
}

export async function pendingCount(): Promise<number> {
  return (await read()).length;
}

/** Fire one punch per queued tap (server timestamps anyway), clear on success. */
export async function flushPunches(): Promise<{ flushed: number }> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return { flushed: 0 };
  const q = await read();
  if (q.length === 0) return { flushed: 0 };
  let flushed = 0;
  for (const _ of q) {
    try {
      await api.post('/attendance/punch');
      flushed += 1;
    } catch {
      break; // stop on first failure (e.g. already punched out) — keep rest for later
    }
  }
  await write(q.slice(flushed));
  return { flushed };
}

export function watchConnectivity(onOnline: () => void) {
  return NetInfo.addEventListener((s) => {
    if (s.isConnected) onOnline();
  });
}
