import { router } from 'expo-router';
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
import { AppBar, Card, Screen, StatusPill } from '../../components/ui';
import { getAllTickets, setTicketStatus } from '../../services/api';
import { qError } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Admin helpdesk queue — advance ticket status with confirm. */
const NEXT: Record<string, string[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['closed', 'open'],
  closed: [],
};

export default function Tickets() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('open');
  const q = useQuery({ queryKey: ['tickets-all'], queryFn: getAllTickets });
  const rows = (q.data ?? []).filter((t) => (tab === 'all' ? true : t.status === tab));

  const advance = (id: number, status: string) => {
    Alert.alert('Update ticket', `Mark as ${status.replace('_', ' ')}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            await setTicketStatus(id, status);
            qc.invalidateQueries({ queryKey: ['tickets-all'] });
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
        <AppBar title="Helpdesk" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => q.refetch()} />}>
        <View style={styles.tabs}>
          {(['open', 'in_progress', 'closed', 'all'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t.replace('_', ' ')}</Text>
            </Pressable>
          ))}
        </View>
        {q.isLoading && <ActivityIndicator color={colors.navy} style={{ marginTop: 16 }} />}
        {q.error && (
          <Card>
            <Text style={styles.err}>{qError(q.error)}</Text>
          </Card>
        )}
        {rows.map((t) => (
          <Card key={t.id} style={styles.card}>
            <View style={styles.top}>
              <View style={styles.mid}>
                <Text style={styles.subject}>{t.subject}</Text>
                <Text style={styles.meta}>
                  {t.category} • EMP-{String(t.employee_id).padStart(4, '0')} • {t.created_at.slice(0, 10)}
                </Text>
                {!!t.body && <Text style={styles.body2}>{t.body}</Text>}
              </View>
              <StatusPill status={t.status === 'open' ? 'Pending' : t.status === 'closed' ? 'Approved' : 'On Leave'} />
            </View>
            <View style={styles.actions}>
              {/payslip|payroll|salary/i.test(t.category) && (
                <Pressable
                  style={styles.payroll}
                  onPress={() => router.push(`/(admin)/payroll/employee/${t.employee_id}` as never)}>
                  <Text style={styles.payrollText}>→ {`EMP-${t.employee_id}`} payroll</Text>
                </Pressable>
              )}
              {(NEXT[t.status] ?? []).map((n) => (
                <Pressable key={n} style={styles.act} onPress={() => advance(t.id, n)}>
                  <Text style={styles.actText}>→ {n.replace('_', ' ')}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ))}
        {!q.isLoading && rows.length === 0 && (
          <Card>
            <Text style={styles.muted}>No tickets here.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tab: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FFF' },
  tabOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  tabText: { fontFamily: fonts.display, fontSize: 12, color: colors.muted, textTransform: 'capitalize' },
  tabTextOn: { color: '#FFF' },
  card: { gap: 8 },
  top: { flexDirection: 'row', gap: 10 },
  mid: { flex: 1 },
  subject: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  meta: { fontSize: 11, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  body2: { fontSize: 13, fontFamily: fonts.body, color: colors.text, marginTop: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  payroll: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  payrollText: { color: '#FFF', fontFamily: fonts.display, fontSize: 12 },
  act: { backgroundColor: colors.royalSoft, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8 },
  actText: { color: colors.navy, fontFamily: fonts.display, fontSize: 12, textTransform: 'capitalize' },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
