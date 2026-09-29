import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar, Card, Screen } from '../../components/ui';
import { useInbox } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Admin approvals hub — live counts from GET /approvals/inbox, each row deep-links. */
export default function Approvals() {
  const { data, isLoading, error, refetch } = useInbox();
  const rows = [
    { label: 'Leave Requests', n: data.leaves, to: '/(admin)/leaves', icon: '📝' },
    { label: 'Regularization', n: data.regularizations, to: '/(admin)/regs', icon: '🕘' },
    { label: 'Helpdesk Tickets', n: data.tickets, to: '/(admin)/tickets', icon: '🎫' },
    { label: 'Exits Pending', n: data.exits, to: '/(admin)/exits', icon: '🚪' },
  ] as const;

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Approvals" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        {isLoading && <ActivityIndicator color={colors.navy} style={{ marginTop: 24 }} />}
        {error && (
          <Card>
            <Text style={styles.err}>{error}</Text>
          </Card>
        )}
        {rows.map((r) => (
          <Pressable key={r.label} onPress={() => router.push(r.to as never)}>
            <Card style={styles.row}>
              <Text style={styles.icon}>{r.icon}</Text>
              <Text style={styles.label}>{r.label}</Text>
              <View style={styles.count}>
                <Text style={styles.countText}>{r.n}</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 22 },
  label: { flex: 1, fontSize: 15, fontFamily: fonts.display, color: colors.text },
  count: { backgroundColor: colors.navy, borderRadius: radius.pill, minWidth: 32, alignItems: 'center', paddingVertical: 4 },
  countText: { color: '#FFF', fontFamily: fonts.display, fontSize: 13 },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
