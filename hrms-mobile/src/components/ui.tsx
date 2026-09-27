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
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.appbar}>
      <Text style={styles.appbarTitle}>{title}</Text>
      <View style={styles.appbarRight}>{right}</View>
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

export function Avatar({ initials, tone = 0 }: { initials: string; tone?: number }) {
  const bgs = ['#1E3A8A', '#2563EB', '#0F172A', '#DBEAFE', '#EFF6FF'];
  const fgs = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#1E3A8A', '#1E3A8A'];
  return (
    <View style={[styles.avatar, { backgroundColor: bgs[tone % bgs.length] }]}>
      <Text style={[styles.avatarText, { color: fgs[tone % fgs.length] }]}>{initials}</Text>
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
