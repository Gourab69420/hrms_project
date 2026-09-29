import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar, Card, Screen } from '../../components/ui';
import { useHolidays } from '../../services/useHrms';
import { colors, fonts } from '../../theme';

/** Company holiday calendar (read-only for employees). */
export default function Holidays() {
  const { data, isLoading, error, refetch } = useHolidays();
  const upcoming = data.filter((h) => h.date >= new Date().toISOString().slice(0, 10));

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Holidays" />
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
        <Text style={styles.h}>Upcoming ({upcoming.length})</Text>
        {upcoming.map((h) => (
          <Card key={h.id} style={styles.row}>
            <View style={styles.mid}>
              <Text style={styles.name}>🎉 {h.name}</Text>
              <Text style={styles.date}>{h.date}</Text>
            </View>
          </Card>
        ))}
        <Text style={styles.h}>Past</Text>
        {data
          .filter((h) => h.date < new Date().toISOString().slice(0, 10))
          .map((h) => (
            <Card key={h.id} style={styles.row}>
              <View style={styles.mid}>
                <Text style={[styles.name, { color: colors.muted }]}>{h.name}</Text>
                <Text style={styles.date}>{h.date}</Text>
              </View>
            </Card>
          ))}
        {!isLoading && data.length === 0 && (
          <Card>
            <Text style={styles.muted}>No holidays published yet.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  h: { fontSize: 15, fontFamily: fonts.display, color: colors.text, marginTop: 4 },
  row: { flexDirection: 'row' },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  date: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2, fontVariant: ['tabular-nums'] },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
