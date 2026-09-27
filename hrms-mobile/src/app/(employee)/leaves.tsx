import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppBar, Card, Screen, StatusPill } from '../../components/ui';
import { useCancelLeave, useMyLeaves } from '../../services/useHrms';
import {colors, radius, fonts} from '../../theme';

/** PAGE 8/11 — My Leaves. Pending requests can be cancelled (DELETE /leaves/{id}). */
const TABS = ['All', 'Pending', 'Approved', 'Rejected'] as const;

export default function EmpLeaves() {
  const { data, isLoading, error, refetch } = useMyLeaves();
  const cancel = useCancelLeave();
  const [tab, setTab] = useState<(typeof TABS)[number]>('All');
  const rows = useMemo(() => (tab === 'All' ? data : data.filter((l) => l.status === tab)), [data, tab]);

  const onCancel = (id: number, tag: string) => {
    Alert.alert('Cancel leave', `Withdraw request ${tag}?`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: () =>
          cancel.mutate(id, {
            onError: (e) => Alert.alert('Failed', e instanceof Error ? e.message : 'Try again'),
          }),
      },
    ]);
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar
          title="Leaves"
          right={<Ionicons name="notifications-outline" size={22} color={colors.text} />}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        <View style={styles.head}>
          <View>
            <Text style={styles.eyebrow}>SELF SERVICE</Text>
            <Text style={styles.title}>Leave Requests</Text>
          </View>
          <Pressable style={styles.apply} onPress={() => router.push('/(employee)/apply-leave')}>
            <Text style={styles.applyText}>+  Apply Leave</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, active && styles.tabActive]}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading && <ActivityIndicator color={colors.navy} style={{ marginVertical: 16 }} />}
        {error && (
          <Card>
            <Text style={styles.err}>{error}</Text>
          </Card>
        )}
        {!isLoading && !error && rows.length === 0 && (
          <Card>
            <Text style={styles.muted}>No {tab === 'All' ? '' : tab.toLowerCase() + ' '}leave requests yet.</Text>
          </Card>
        )}
        {rows.map((l) => (
          <Card key={l.id} style={styles.card}>
            <View style={styles.top}>
              <View style={styles.mid}>
                <Text style={styles.type}>
                  {l.type} <Text style={styles.id}>{l.tag}</Text>
                </Text>
                <Text style={styles.dates}>{l.days}</Text>
              </View>
              <StatusPill status={l.status} />
            </View>
            {!!l.reason && (
              <View style={styles.reason}>
                <Text style={styles.reasonLbl}>Reason</Text>
                <Text style={styles.reasonText}>{l.reason}</Text>
              </View>
            )}
            {l.status === 'Pending' && (
              <Pressable style={styles.cancel} onPress={() => onCancel(l.id, l.tag)}>
                <Text style={styles.cancelText}>Withdraw request</Text>
              </Pressable>
            )}
          </Card>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 11, fontFamily: fonts.display, color: colors.muted, letterSpacing: 1 },
  title: { fontSize: 22, fontFamily: fonts.displayExtra, color: colors.text, marginTop: 2 },
  apply: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 12 },
  applyText: { color: '#FFF', fontFamily: fonts.display, fontSize: 13 },
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: { backgroundColor: colors.royalSoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  tabActive: { backgroundColor: colors.navy },
  tabText: { fontSize: 12, fontFamily: fonts.display, color: colors.muted },
  tabTextActive: { color: '#FFF', fontFamily: fonts.body, },
  card: { gap: 10 },
  top: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  mid: { flex: 1 },
  type: { fontSize: 14, fontFamily: fonts.displayExtra, color: colors.text },
  id: { fontSize: 12, fontFamily: fonts.medium, color: colors.muted },
  dates: { fontSize: 13, color: colors.muted, marginTop: 3, fontFamily: fonts.body, },
  reason: { backgroundColor: colors.royalSoft, borderRadius: radius.md, padding: 10 },
  reasonLbl: { fontSize: 12, color: colors.muted, fontFamily: fonts.semiBold },
  reasonText: { fontSize: 14, color: colors.text, marginTop: 2, fontFamily: fonts.body, },
  cancel: { alignSelf: 'flex-end', padding: 8 },
  cancelText: { color: colors.dangerDot, fontFamily: fonts.display, fontSize: 13 },
  muted: { color: colors.muted, textAlign: 'center', fontFamily: fonts.body, },
  err: { color: colors.dangerDot, fontFamily: fonts.body, },
});
