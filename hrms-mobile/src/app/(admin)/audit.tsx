import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar, Card, Screen } from '../../components/ui';
import { getAudit } from '../../services/api';
import { useAuth } from '../../store/AuthContext';
import { qError } from '../../services/useHrms';
import { colors, fonts } from '../../theme';

/** Audit trail — every approval, payroll run, employee change. Admin only (backend 403s HR). */
export default function Audit() {
  const { backendRole } = useAuth();
  const q = useQuery({ queryKey: ['audit'], queryFn: () => getAudit(), enabled: backendRole === 'admin' });

  if (backendRole !== 'admin') {
    return (
      <Screen>
        <AppBar title="Audit Log" />
        <Card>
          <Text style={styles.muted}>Admin only — your HR role cannot view the audit trail.</Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Audit Log" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => q.refetch()} />}>
        {q.isLoading && <ActivityIndicator color={colors.navy} style={{ marginTop: 16 }} />}
        {q.error && (
          <Card>
            <Text style={styles.err}>{qError(q.error)}</Text>
          </Card>
        )}
        {(q.data ?? []).map((a) => (
          <Card key={a.id} style={styles.row}>
            <View style={styles.mid}>
              <Text style={styles.action}>{a.action}</Text>
              <Text style={styles.meta}>
                {a.entity}
                {a.entity_id ? ` #${a.entity_id}` : ''} • by user {a.actor_user_id ?? '—'}
                {a.detail ? ` • ${a.detail}` : ''}
              </Text>
            </View>
            <Text style={styles.time}>{a.created_at.slice(0, 16).replace('T', ' ')}</Text>
          </Card>
        ))}
        {!q.isLoading && (q.data ?? []).length === 0 && (
          <Card>
            <Text style={styles.muted}>No audit events yet.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 8, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: 10 },
  mid: { flex: 1 },
  action: { fontSize: 13, fontFamily: fonts.display, color: colors.text },
  meta: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  time: { fontSize: 10, fontFamily: fonts.body, color: colors.placeholder, fontVariant: ['tabular-nums'] },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
