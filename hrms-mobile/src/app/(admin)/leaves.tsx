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
import { AppBar, Avatar, Card, Screen, StatusPill } from '../../components/ui';
import { useAdminLeaveQueue, useLeaveAction } from '../../services/useHrms';
import {colors, radius, fonts} from '../../theme';

/** PAGE 4/11 — Leave Management (live approve/reject with confirm). */
const TABS = ['Pending', 'Approved', 'Rejected', 'All'] as const;

export default function AdminLeaves() {
  const { data, isLoading, error, refetch } = useAdminLeaveQueue();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Pending');
  const act = useLeaveAction();

  const rows = useMemo(
    () => (tab === 'All' ? data : data.filter((l) => l.status === tab)),
    [data, tab],
  );
  const counts = useMemo(
    () => ({
      Pending: data.filter((l) => l.status === 'Pending').length,
      Approved: data.filter((l) => l.status === 'Approved').length,
      Rejected: data.filter((l) => l.status === 'Rejected').length,
    }),
    [data],
  );

  const decide = (id: number, status: 'approved' | 'rejected', name: string) => {
    Alert.alert(`${status === 'approved' ? 'Approve' : 'Reject'} leave`, `${name} — ${`#L-${id}`}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: status === 'approved' ? 'Approve' : 'Reject',
        style: status === 'approved' ? 'default' : 'destructive',
        onPress: () =>
          act.mutate(
            { id, status },
            { onError: (e) => Alert.alert('Failed', e instanceof Error ? e.message : 'Try again') },
          ),
      },
    ]);
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar
          title="Leave Management"
          bellTo="/(admin)/announcements"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        <View style={styles.stats}>
          {[
            { n: String(counts.Pending), l: 'Pending Review' },
            { n: String(counts.Approved), l: 'Approved' },
            { n: String(counts.Rejected), l: 'Rejected' },
          ].map((s) => (
            <Card key={s.l} style={styles.stat}>
              <Text style={styles.statN}>{s.n}</Text>
              <Text style={styles.statL}>{s.l}</Text>
            </Card>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabs}>
            {TABS.map((t) => {
              const active = tab === t;
              const n = t === 'All' ? data.length : counts[t as 'Pending'];
              return (
                <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, active && styles.tabActive]}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {t} ({n})
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Text style={styles.listTitle}>
          Leave Requests <Text style={styles.listDim}>({rows.length} {tab})</Text>
        </Text>

        {isLoading && <ActivityIndicator color={colors.navy} style={{ marginVertical: 16 }} />}
        {error && (
          <Card>
            <Text style={styles.err}>{error}</Text>
          </Card>
        )}
        {!isLoading && !error && rows.length === 0 && (
          <Card>
            <Text style={styles.muted}>No {tab.toLowerCase()} leave requests.</Text>
          </Card>
        )}
        {rows.map((l, i) => (
          <Card key={l.id} style={styles.card}>
            <View style={styles.top}>
              <Avatar
                initials={l.employee.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                tone={i}
              />
              <View style={styles.mid}>
                <Text style={styles.name}>
                  {l.employee} <Text style={styles.code}>• {l.code}</Text>
                </Text>
                <Text style={styles.type}>
                  {l.type} • <Text style={styles.dates}>{l.days}</Text>
                </Text>
              </View>
              <StatusPill status={l.status} />
            </View>
            {!!l.reason && (
              <View style={styles.reason}>
                <Text style={styles.reasonText}>Reason: {l.reason}</Text>
                <Text style={styles.applied}>Applied on {l.appliedOn}</Text>
              </View>
            )}
            {l.status === 'Pending' && (
              <View style={styles.actions}>
                <Pressable style={styles.reject} onPress={() => decide(l.id, 'rejected', l.employee)}>
                  <Text style={styles.rejectText}>✕  Reject</Text>
                </Pressable>
                <Pressable style={styles.approve} onPress={() => decide(l.id, 'approved', l.employee)}>
                  <Text style={styles.approveText}>✓  Approve</Text>
                </Pressable>
              </View>
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
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statN: { fontSize: 22, fontFamily: fonts.displayExtra, color: colors.text },
  statL: { fontSize: 11, color: colors.muted, textAlign: 'center', fontFamily: fonts.body, },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { backgroundColor: '#FFF', borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  tabActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  tabText: { fontSize: 13, fontFamily: fonts.display, color: colors.muted },
  tabTextActive: { color: '#FFF', fontFamily: fonts.body, },
  listTitle: { fontSize: 16, fontFamily: fonts.displayExtra, color: colors.text },
  listDim: { fontSize: 13, fontFamily: fonts.medium, color: colors.muted },
  card: { gap: 10 },
  top: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  code: { fontSize: 12, fontFamily: fonts.medium, color: colors.muted },
  type: { fontSize: 13, color: colors.muted, marginTop: 3, fontFamily: fonts.body, },
  dates: { color: colors.navy, fontFamily: fonts.display },
  reason: { backgroundColor: colors.royalSoft, borderRadius: radius.md, padding: 10 },
  reasonText: { fontSize: 13, color: colors.text, fontFamily: fonts.body, },
  applied: { fontSize: 12, color: colors.muted, marginTop: 4, fontFamily: fonts.body, },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, alignItems: 'center' },
  reject: { paddingHorizontal: 8, paddingVertical: 10 },
  rejectText: { color: colors.dangerDot, fontFamily: fonts.display, fontSize: 14 },
  approve: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingHorizontal: 18, paddingVertical: 10 },
  approveText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
  muted: { color: colors.muted, textAlign: 'center', fontFamily: fonts.body, },
  err: { color: colors.dangerDot, fontFamily: fonts.body, },
});
