import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppBar, Avatar, Card, Screen, StatusPill, initialsOf, toneFor } from '../../../../components/ui';
import { api, type BackendPayroll } from '../../../../services/api';
import { qError, useEmployees } from '../../../../services/useHrms';
import { colors, fonts } from '../../../../theme';

/** One employee's payroll (opened from a payroll ticket). Backend-verified employee. */
export default function EmployeePayroll() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const empId = Number(id);
  const { data: emps } = useEmployees();
  const emp = emps.find((e) => e.id === empId);
  const q = useQuery({
    queryKey: ['payroll-emp', empId],
    queryFn: () => api.get<BackendPayroll[]>(`/payroll/employee/${empId}`).then((r) => r.data),
    enabled: Number.isFinite(empId),
  });

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const monthName = (m: number, y: number) =>
    new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title={emp ? `${emp.first_name} ${emp.last_name}` : `EMP-${empId}`} />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => q.refetch()} />}>
        {emp && (
          <Card style={styles.head}>
            <Avatar initials={initialsOf(`${emp.first_name} ${emp.last_name}`)} tone={toneFor(emp.id)} />
            <View style={styles.mid}>
              <Text style={styles.name}>
                {emp.first_name} {emp.last_name}
              </Text>
              <Text style={styles.sub}>
                {emp.code} • {emp.department}
              </Text>
            </View>
          </Card>
        )}
        {q.isLoading && <ActivityIndicator color={colors.navy} style={{ marginTop: 16 }} />}
        {q.error && (
          <Card>
            <Text style={styles.err}>{qError(q.error)}</Text>
          </Card>
        )}
        {(q.data ?? []).map((p) => (
          <Card key={p.id}>
            <View style={styles.top}>
              <View style={styles.mid}>
                <Text style={styles.month}>{monthName(p.month, p.year)}</Text>
                <Text style={styles.lines}>
                  Basic {fmt(p.basic_salary)}
                  {p.hra ? ` + HRA ${fmt(p.hra)}` : ''}
                  {p.bonuses ? ` + Bonus ${fmt(p.bonuses)}` : ''} − PF {fmt(p.pf_amount)} − PT{' '}
                  {fmt(p.pt_amount)} − TDS {fmt(p.tds_amount)}
                  {p.loan_deduction ? ` − EMI ${fmt(p.loan_deduction)}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={styles.net}>{fmt(p.net_salary)}</Text>
                <StatusPill status={p.paid_at ? 'Processed' : 'Pending'} />
              </View>
            </View>
          </Card>
        ))}
        {!q.isLoading && !q.error && (q.data ?? []).length === 0 && (
          <Card>
            <Text style={styles.muted}>No payroll records for this employee yet.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mid: { flex: 1 },
  name: { fontSize: 16, fontFamily: fonts.displayExtra, color: colors.text },
  sub: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  top: { flexDirection: 'row', gap: 10 },
  month: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  lines: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 4, fontVariant: ['tabular-nums'] },
  net: { fontSize: 16, fontFamily: fonts.displayExtra, color: colors.text, fontVariant: ['tabular-nums'] },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
