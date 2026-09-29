import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { api, decideReg, getTeamRegs, setLeaveStatus, type BackendEmployee, type BackendLeave } from '../../services/api';
import { leaveToUI, qError } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Team approvals — direct reports' pending leaves + regularization. Managers only (others see empty). */
export default function Team() {
  const qc = useQueryClient();
  const leavesQ = useQuery({
    queryKey: ['leaves-team'],
    queryFn: () => api.get<BackendLeave[]>('/leaves/team').then((r) => r.data),
  });
  const regsQ = useQuery({ queryKey: ['regs-team'], queryFn: getTeamRegs });
  const empsQ = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get<BackendEmployee[]>('/employees/').then((r) => r.data),
  });

  const byId = new Map((empsQ.data ?? []).map((e) => [e.id, e]));
  const leaves = (leavesQ.data ?? []).map((l) => leaveToUI(l, byId));

  const decideLeave = (id: number, status: 'approved' | 'rejected', name: string) => {
    Alert.alert(`${status === 'approved' ? 'Approve' : 'Reject'}`, `${name} — #L-${id}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: status === 'approved' ? 'default' : 'destructive',
        onPress: async () => {
          try {
            await setLeaveStatus(id, status);
            qc.invalidateQueries({ queryKey: ['leaves-team'] });
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
          }
        },
      },
    ]);
  };

  const decideR = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await decideReg(id, status);
      qc.invalidateQueries({ queryKey: ['regs-team'] });
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const loading = leavesQ.isLoading || regsQ.isLoading;
  const forbidden =
    (leavesQ.error as { status?: number } | null)?.status === 403 &&
    (regsQ.error as { status?: number } | null)?.status === 403;

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Team Approvals" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              leavesQ.refetch();
              regsQ.refetch();
            }}
          />
        }>
        {loading && <ActivityIndicator color={colors.navy} style={{ marginTop: 16 }} />}
        {forbidden && (
          <Card>
            <Text style={styles.muted}>No direct reports — nothing to review.</Text>
          </Card>
        )}
        <Text style={styles.h}>Leave requests ({leaves.length})</Text>
        {leaves.map((l, i) => (
          <Card key={l.id} style={styles.card}>
            <View style={styles.top}>
              <Avatar
                initials={l.employee.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                tone={i}
              />
              <View style={styles.mid}>
                <Text style={styles.name}>
                  {l.employee} <Text style={styles.dim}>• {l.code}</Text>
                </Text>
                <Text style={styles.sub}>
                  {l.type} • {l.days}
                </Text>
                {!!l.reason && <Text style={styles.reason}>{l.reason}</Text>}
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => decideLeave(l.id, 'rejected', l.employee)}>
                <Text style={styles.reject}>✕ Reject</Text>
              </Pressable>
              <Pressable style={styles.approve} onPress={() => decideLeave(l.id, 'approved', l.employee)}>
                <Text style={styles.approveText}>✓ Approve</Text>
              </Pressable>
            </View>
          </Card>
        ))}

        <Text style={styles.h}>Regularization ({(regsQ.data ?? []).length})</Text>
        {(regsQ.data ?? []).map((r) => (
          <Card key={r.id} style={styles.card}>
            <View style={styles.top}>
              <View style={styles.mid}>
                <Text style={styles.name}>
                  EMP-{String(r.employee_id).padStart(4, '0')} <Text style={styles.dim}>• {r.date}</Text>
                </Text>
                <Text style={styles.sub}>
                  In {r.req_check_in?.slice(11, 16) ?? '—'} → Out {r.req_check_out?.slice(11, 16) ?? '—'}
                </Text>
                {!!r.reason && <Text style={styles.reason}>{r.reason}</Text>}
              </View>
              <StatusPill status="Pending" />
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => decideR(r.id, 'rejected')}>
                <Text style={styles.reject}>✕ Reject</Text>
              </Pressable>
              <Pressable style={styles.approve} onPress={() => decideR(r.id, 'approved')}>
                <Text style={styles.approveText}>✓ Approve</Text>
              </Pressable>
            </View>
          </Card>
        ))}
        {!loading && leaves.length === 0 && (regsQ.data ?? []).length === 0 && !forbidden && (
          <Card>
            <Text style={styles.muted}>All caught up — no pending team requests.</Text>
          </Card>
        )}
        {(leavesQ.error ?? regsQ.error) && !forbidden && (
          <Card>
            <Text style={styles.err}>{qError((leavesQ.error ?? regsQ.error) as unknown)}</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  h: { fontSize: 15, fontFamily: fonts.display, color: colors.text, marginTop: 4 },
  card: { gap: 8 },
  top: { flexDirection: 'row', gap: 10 },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  dim: { fontFamily: fonts.body, color: colors.muted, fontSize: 12 },
  sub: { fontSize: 13, fontFamily: fonts.body, color: colors.muted, marginTop: 3 },
  reason: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 3 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, alignItems: 'center' },
  reject: { color: colors.dangerDot, fontFamily: fonts.display, fontSize: 14 },
  approve: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 9 },
  approveText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
