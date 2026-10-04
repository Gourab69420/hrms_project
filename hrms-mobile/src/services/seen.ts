import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { useAnnouncements, usePolls } from './useHrms';

export type UnseenItem = { id: number; title: string; kind: 'ann' | 'poll' };

async function readSeen(key: string): Promise<{ ann: number[]; polls: number[] }> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    if (raw) {
      const p = JSON.parse(raw);
      return { ann: p.ann ?? [], polls: p.polls ?? [] };
    }
  } catch {
    /* ignore */
  }
  return { ann: [], polls: [] };
}

async function writeSeen(key: string, v: { ann: number[]; polls: number[] }) {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

// Cross-component refresh: marking seen in the popup instantly clears every bell dot.
let version = 0;
const listeners = new Set<() => void>();
function touch() {
  version += 1;
  listeners.forEach((l) => l());
}
function useVersion() {
  const [, setV] = useState(0);
  useEffect(() => {
    const f = () => setV((v) => v + 1);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
  return version;
}

/** Unseen announcements + active polls for the logged-in user. Empty when logged out. */
export function useUnseen() {
  const { user } = useAuth();
  const ann = useAnnouncements();
  const polls = usePolls();
  const ver = useVersion();
  const [unseen, setUnseen] = useState<UnseenItem[]>([]);
  const key = user ? `hrms_seen_${user.id}` : null;

  const items = useMemo<UnseenItem[]>(
    () => [
      ...(ann.data ?? []).map((a) => ({ id: a.id, title: a.title, kind: 'ann' as const })),
      ...(polls.data ?? [])
        .filter((p) => p.active)
        .map((p) => ({ id: p.id, title: p.question, kind: 'poll' as const })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ann.data, polls.data, ver],
  );

  const refresh = useCallback(async () => {
    if (!key) {
      setUnseen([]);
      return;
    }
    const seen = await readSeen(key);
    setUnseen(
      items.filter((i) => (i.kind === 'ann' ? !seen.ann.includes(i.id) : !seen.polls.includes(i.id))),
    );
  }, [key, items]);

  useEffect(() => {
    if (!key || ann.isLoading || polls.isLoading) return;
    if (items.length === 0) {
      setUnseen([]);
      return;
    }
    refresh();
  }, [key, items, ann.isLoading, polls.isLoading, refresh]);

  const markSeen = useCallback(async () => {
    if (!key) return;
    const seen = await readSeen(key);
    await writeSeen(key, {
      ann: [...new Set([...seen.ann, ...items.filter((i) => i.kind === 'ann').map((i) => i.id)])],
      polls: [...new Set([...seen.polls, ...items.filter((i) => i.kind === 'poll').map((i) => i.id)])],
    });
    setUnseen([]);
    touch();
  }, [key, items]);

  return { unseen, count: unseen.length, markSeen, refresh };
}
