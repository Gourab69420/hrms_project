import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar, Card, Screen } from '../../components/ui';
import { useMyLoans } from '../../services/useHrms';
import { colors, fonts } from '../../theme';

/** My loans & advances — EMIs auto-deduct in payroll runs. */
export default function Loans() {
  const { data, isLoading, error, refetch } = useMyLoans();

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Loans" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        {isLoading && <ActivityIndicator color={colors.navy} style={{ marginTop: 16 }} />}
        {error && (
          <Card>
            <Text style={styles.err}>{error}</Text>
          </Card>
        )}
        {data.map((l) => (
          <Card key={l.id}>
            <Text style={styles.head}>₹{l.principal.toLocaleString('en-IN')}</Text>
            <Text style={styles.row}>EMI ₹{l.monthly_installment.toLocaleString('en-IN')} / month</Text>
            <Text style={styles.row}>Remaining ₹{l.remaining.toLocaleString('en-IN')}</Text>
            <Text style={[styles.row, { color: l.status === 'active' ? colors.success : colors.muted }]}>
              {l.status.toUpperCase()}
            </Text>
          </Card>
        ))}
        {!isLoading && data.length === 0 && (
          <Card>
            <Text style={styles.muted}>No loans or advances. Ask HR to issue one against your account.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  head: { fontSize: 22, fontFamily: fonts.displayExtra, color: colors.text, fontVariant: ['tabular-nums'] },
  row: { fontSize: 13, fontFamily: fonts.body, color: colors.text, marginTop: 4, fontVariant: ['tabular-nums'] },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
