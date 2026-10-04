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
import { initialsOf, toneFor } from '../../components/ui';
import { useTeam } from '../../services/useHrms';
import { colors, fonts } from '../../theme';

/** My Team — direct reports of the logged-in employee. Approvals live in the Admin app only. */
export default function Team() {
  const { data, isLoading, error, refetch } = useTeam();

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="My Team" />
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
        {!isLoading && !error && (
          <Text style={styles.count}>
            {data.length} team member{data.length === 1 ? '' : 's'} report to you
          </Text>
        )}
        {data.map((m) => (
          <Card key={m.id} style={styles.row}>
            <Avatar initials={initialsOf(`${m.first_name} ${m.last_name}`)} tone={toneFor(m.id)} />
            <View style={styles.mid}>
              <Text style={styles.name}>
                {m.first_name} {m.last_name}
              </Text>
              <Text style={styles.sub}>{m.position || '—'}</Text>
              <Text style={styles.sub}>{m.email}</Text>
            </View>
            <StatusPill status={m.is_active ? 'Active' : 'On Leave'} />
          </Card>
        ))}
        {!isLoading && !error && data.length === 0 && (
          <Card>
            <Text style={styles.muted}>
              Nobody reports to you yet. Ask HR to set you as their manager.
            </Text>
            <Pressable style={styles.link} onPress={() => router.push('/(employee)/leaves')}>
              <Text style={styles.linkText}>Go to My Leaves →</Text>
            </Pressable>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  count: { fontSize: 13, fontFamily: fonts.body, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mid: { flex: 1 },
  name: { fontSize: 15, fontFamily: fonts.display, color: colors.text },
  sub: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
  link: { marginTop: 10, alignItems: 'center' },
  linkText: { color: colors.royal, fontFamily: fonts.display, fontSize: 13 },
});
