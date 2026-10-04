import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
import { AppBar, Avatar, Card, Screen, initialsOf, toneFor, StatusPill } from '../../components/ui';
import { decideReg, getAllRegs, type Reg } from '../../services/api';
import { useEmployees, useRegPending } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Admin regularization queue — approve applies corrected times onto attendance. */
export default function Regs() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const q = useQuery({ queryKey: ['regs-all'], queryFn: getAllRegs });
  const { data: emps } = useEmployees();
  const { pending, refetch: refetchCount } = useRegPending();
  const rows = (q.data ?? []).filter((r) => tab === 'all' || r.status === 'pending');
  const nameOf = (id: number) => {
    const e = emps.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : `EMP-${String(id).padStart(4, '0')}`;
  };

  const decide = (r: Reg, status: 'approved' | 'rejected') => {
    Alert.alert(`${status === 'approved' ? 'Approve' : 'Reject'}`, `Correction for ${r.date}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: status === 'approved' ? 'Approve' : 'Reject',
        style: status === 'approved' ? 'default' : 'destructive',
        onPress: async () => {
          try {
            await decideReg(r.id, status);
            qc.invalidateQueries({ queryKey: ['regs-all'] });
            qc.invalidateQueries({ queryKey: ['regs-pending-count'] });
            qc.invalidateQueries({ queryKey: ['inbox'] });
            refetchCount();
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
          }
        },
      },
    ]);
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Regularization" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { q.refetch(); refetchCount(); }} />}>
        <View style={styles.tabs}>
          {(['pending', 'all'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                {t === 'pending' ? `Pending (${pending})` : 'All'}
              </Text>
            </Pressable>
          ))}
        </View>
        {q.isLoading && <ActivityIndicator color={colors.navy} style={{ marginTop: 16 }} />}
        {rows.map((r) => (
          <Card key={r.id} style={styles.card}>
            <View style={styles.top}>
              <Avatar initials={initialsOf(nameOf(r.employee_id))} tone={toneFor(r.employee_id)} />
              <View style={styles.mid}>
                <Text style={styles.name}>
                  {nameOf(r.employee_id)} <Text style={styles.dim}>• {r.date}</Text>
                </Text>
                <Text style={styles.times}>
                  In {r.req_check_in?.slice(11, 16) ?? '—'} → Out {r.req_check_out?.slice(11, 16) ?? '—'}
                </Text>
                {!!r.reason && <Text style={styles.reason}>{r.reason}</Text>}
              </View>
              <StatusPill status={r.status === 'pending' ? 'Pending' : r.status === 'approved' ? 'Approved' : 'Rejected'} />
            </View>
            {r.status === 'pending' && (
              <View style={styles.actions}>
                <Pressable onPress={() => decide(r, 'rejected')}>
                  <Text style={styles.reject}>✕ Reject</Text>
                </Pressable>
                <Pressable style={styles.approve} onPress={() => decide(r, 'approved')}>
                  <Text style={styles.approveText}>✓ Approve</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ))}
        {!q.isLoading && rows.length === 0 && (
          <Card>
            <Text style={styles.muted}>Nothing here.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#FFF' },
  tabOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  tabText: { fontFamily: fonts.display, fontSize: 13, color: colors.muted },
  tabTextOn: { color: '#FFF' },
  card: { gap: 8 },
  top: { flexDirection: 'row', gap: 10 },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  dim: { fontFamily: fonts.body, color: colors.muted, fontSize: 12 },
  times: { fontSize: 13, fontFamily: fonts.body, color: colors.text, marginTop: 3, fontVariant: ['tabular-nums'] },
  reason: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 3 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, alignItems: 'center' },
  reject: { color: colors.dangerDot, fontFamily: fonts.display, fontSize: 14 },
  approve: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 9 },
  approveText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
});
