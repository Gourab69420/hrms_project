import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {colors, radius, shadow, type, fonts} from '../theme';

/** Full-screen canvas: matches Stitch #F8F9FD + 16px margins. */
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}

export function AppBar({
  title,
  right,
  bellTo,
  noBack,
}: {
  title: string;
  right?: ReactNode;
  /** href for the notification bell (announcements/notices). Omit to hide the bell. */
  bellTo?: string;
  /** hide the auto back button (default: show whenever navigation can go back) */
  noBack?: boolean;
}) {
  let canGoBack = false;
  try {
    canGoBack = !noBack && router.canGoBack();
  } catch {
    canGoBack = false;
  }
  return (
    <View style={styles.appbar}>
      <View style={styles.appbarLeft}>
        {canGoBack && (
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        )}
        <Text style={styles.appbarTitle}>{title}</Text>
      </View>
      <View style={styles.appbarRight}>
        {bellTo && (
          <Pressable onPress={() => router.push(bellTo as never)} hitSlop={10}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </Pressable>
        )}
        {right}
      </View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const pill: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Active: { bg: colors.successBg, border: colors.successBorder, text: colors.success, dot: colors.successDot },
  Approved: { bg: '#EAF0FF', border: colors.royalBorder, text: colors.navy, dot: colors.royal },
  Processed: { bg: '#EAF0FF', border: colors.royalBorder, text: colors.navy, dot: colors.royal },
  Present: { bg: colors.successBg, border: colors.successBorder, text: colors.success, dot: colors.successDot },
  Pending: { bg: '#EAF0FF', border: colors.royalBorder, text: colors.royal, dot: colors.royal },
  'On Leave': { bg: colors.warningBg, border: colors.warningBorder, text: colors.warning, dot: colors.warningDot },
  Rejected: { bg: colors.dangerBg, border: colors.dangerBorder, text: colors.danger, dot: colors.dangerDot },
};

export function StatusPill({ status }: { status: string }) {
  const c = pill[status] ?? pill.Pending;
  return (
    <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
      <View style={[styles.dot, { backgroundColor: c.dot }]} />
      <Text style={[styles.pillText, { color: c.text }]}>{status}</Text>
    </View>
  );
}

/** Standard initials: first letters of first two words, uppercased. Empty name -> "?" fallback. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/** Stable color slot per id so the same employee always gets the same avatar. */
export function toneFor(id: number): number {
  return Math.abs(id) % 5;
}

export function Avatar({ initials, tone = 0, size = 52 }: { initials: string; tone?: number; size?: number }) {
  const bgs = ['#1E3A8A', '#2563EB', '#0F172A', '#DBEAFE', '#EFF6FF'];
  const fgs = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#1E3A8A', '#1E3A8A'];
  const label = initials.trim() || '?';
  return (
    <View
      style={[
        styles.avatar,
        { backgroundColor: bgs[tone % bgs.length], width: size, height: size, borderRadius: size / 2 },
      ]}>
      <Text style={[styles.avatarText, { color: fgs[tone % fgs.length], fontSize: size * 0.35 }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.primary} onPress={onPress}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.search}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search by name, role, department..."
        placeholderTextColor={colors.placeholder}
        style={styles.searchInput}
      />
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 16 },
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  appbarTitle: { fontSize: 22, fontFamily: fonts.displayExtra, color: colors.text, letterSpacing: -0.3 },
  appbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  backBtn: { marginLeft: -8, padding: 4 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.card,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontFamily: fonts.display },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: fonts.displayExtra },
  primary: {
    backgroundColor: colors.navy,
    borderRadius: radius.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryText: { color: '#FFF', fontSize: 15, fontFamily: fonts.display },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 10,
  },
  searchIcon: { fontSize: 18, color: colors.muted, fontFamily: fonts.body, },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, fontFamily: fonts.body, },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: { ...type.section, color: colors.text },
  empty: { alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { fontSize: 15, fontFamily: fonts.display, color: colors.text },
  emptyHint: { fontSize: 13, color: colors.muted, marginTop: 4, textAlign: 'center', fontFamily: fonts.body, },
});
