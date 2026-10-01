import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppBar, Avatar, Card, Screen, StatusPill } from '../../components/ui';
import { useAdminPayrolls } from '../../services/useHrms';
import {colors, radius, fonts} from '../../theme';

/** PAGE 5/11 — Admin Payroll (live list). Run Payroll opens the create form. */
export default function AdminPayroll() {
  const { data, isLoading, error, refetch } = useAdminPayrolls();
  const processed = data.filter((r) => r.status === 'Processed').length;

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar
          title="Payroll"
          bellTo="/(admin)/announcements"
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        <Card style={styles.hero}>
          <Text style={styles.eyebrow}>
            {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()} CYCLE
          </Text>
          <Text style={styles.total}>
            {data.length} record{data.length === 1 ? '' : 's'} • {processed} processed
          </Text>
          <Pressable style={styles.cta} onPress={() => router.push('/(admin)/payroll/run')}>
            <Text style={styles.ctaText}>+  Run Payroll</Text>
          </Pressable>
        </Card>

        <Text style={styles.title}>Staff Payroll</Text>
        {isLoading && <ActivityIndicator color={colors.navy} style={{ marginVertical: 16 }} />}
        {error && (
          <Card>
            <Text style={styles.err}>{error}</Text>
          </Card>
        )}
        {!isLoading && !error && data.length === 0 && (
          <Card>
            <Text style={styles.muted}>No payroll records yet. Tap Run Payroll to create the first one.</Text>
          </Card>
        )}
        {data.map((r, i) => (
          <Card key={r.id} style={styles.row}>
            <Avatar
              initials={r.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              tone={i}
            />
            <View style={styles.mid}>
              <Text style={styles.name}>{r.name}</Text>
              <Text style={styles.code}>{r.code}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.net}>{r.net}</Text>
              <StatusPill status={r.status} />
            </View>
          </Card>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  hero: { backgroundColor: colors.navy, borderColor: colors.navy, gap: 8 },
  eyebrow: { color: '#B6C4FF', fontSize: 11, fontFamily: fonts.display, letterSpacing: 1 },
  total: { color: '#FFF', fontSize: 20, fontFamily: fonts.displayExtra },
  cta: { backgroundColor: '#FFF', borderRadius: radius.sm, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaText: { color: colors.navy, fontFamily: fonts.displayExtra, fontSize: 14 },
  title: { fontSize: 17, fontFamily: fonts.displayExtra, color: colors.text, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  code: { fontSize: 12, color: colors.muted, marginTop: 2, fontFamily: fonts.body, },
  net: { fontSize: 15, fontFamily: fonts.displayExtra, color: colors.text, fontVariant: ['tabular-nums'] },
  muted: { color: colors.muted, textAlign: 'center', fontFamily: fonts.body, },
  err: { color: colors.dangerDot, fontFamily: fonts.body, },
});
