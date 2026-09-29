import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar, Card, Screen } from '../../components/ui';
import { getLeaveTypes } from '../../services/api';
import { qError } from '../../services/useHrms';
import { colors, fonts } from '../../theme';

/** Leave-type quotas (managed under Shifts & Types). Read-only reference here. */
export default function LeaveTypes() {
  const q = useQuery({ queryKey: ['leave-types'], queryFn: getLeaveTypes });
  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Leave Types" />
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
        {(q.data ?? []).map((t) => (
          <Card key={t.id} style={styles.row}>
            <View style={styles.mid}>
              <Text style={styles.name}>{t.name}</Text>
              <Text style={styles.meta}>
                {t.yearly_quota}/yr • {t.paid ? 'paid' : 'unpaid'}
                {t.description ? ` • ${t.description}` : ''}
              </Text>
            </View>
          </Card>
        ))}
        <Text style={styles.hint}>Quotas are edited under Shifts & Types.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  row: { flexDirection: 'row' },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text, textTransform: 'capitalize' },
  meta: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  hint: { fontSize: 12, fontFamily: fonts.body, color: colors.placeholder, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
