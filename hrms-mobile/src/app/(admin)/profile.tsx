import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar, Avatar, Card, Screen, StatusPill } from '../../components/ui';
import { useAuth } from '../../store/AuthContext';
import { useEmployee } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Admin's own profile — info + self edit + sign out. Only ever shows the logged-in admin. */
export default function AdminProfile() {
  const { signOut, user, backendRole } = useAuth();
  const { data: e, isLoading, error, refetch } = useEmployee(user?.employee_id ?? NaN);

  if (isLoading) {
    return (
      <Screen>
        <AppBar title="Profile" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Profile" bellTo="/(admin)/announcements" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        {error || !e ? (
          <Card>
            <Text style={styles.err}>{error ?? 'No linked employee profile'}</Text>
            <Text style={styles.meta}>Signed in as {user?.username} ({backendRole})</Text>
          </Card>
        ) : (
          <>
            <Card style={styles.head}>
              <Avatar
                initials={`${e.first_name[0] ?? ''}${e.last_name[0] ?? ''}`.toUpperCase()}
                tone={0}
              />
              <View style={styles.mid}>
                <Text style={styles.name}>
                  {e.first_name} {e.last_name}
                </Text>
                <Text style={styles.sub}>
                  {user?.username} • {backendRole}
                </Text>
                <Text style={styles.sub}>{e.position || 'Administrator'}</Text>
                <StatusPill status={e.status} />
              </View>
            </Card>
            <Card>
              <Row label="Email" value={e.email} />
              <Row label="Phone" value={e.phone || '—'} />
              <Row label="Department" value={e.department} />
              <Row label="Employee code" value={e.code} />
            </Card>
            <Pressable
              style={styles.edit}
              onPress={() => router.push(`/(admin)/staff/edit/${e.id}` as never)}>
              <Ionicons name="create-outline" size={18} color="#FFF" />
              <Text style={styles.editText}>Edit my details</Text>
            </Pressable>
          </>
        )}

        <Pressable
          style={styles.signout}
          onPress={async () => {
            await signOut();
            router.replace('/');
          }}>
          <Text style={styles.signoutText}>⇥   Sign Out of Account</Text>
        </Pressable>
        <Text style={styles.ver}>Workforce OS • v2.4.1 (Build 402)</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.lbl}>{label}</Text>
      <Text style={styles.val}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  mid: { flex: 1, gap: 3 },
  name: { fontSize: 18, fontFamily: fonts.displayExtra, color: colors.text },
  sub: { fontSize: 13, fontFamily: fonts.body, color: colors.muted },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  lbl: { fontSize: 12, fontFamily: fonts.body, color: colors.muted },
  val: { fontSize: 13, fontFamily: fonts.display, color: colors.text, maxWidth: '60%', textAlign: 'right' },
  meta: { fontSize: 13, fontFamily: fonts.body, color: colors.muted, marginTop: 6, textAlign: 'center' },
  err: { fontSize: 14, fontFamily: fonts.body, color: colors.dangerDot, textAlign: 'center' },
  edit: {
    flexDirection: 'row', backgroundColor: colors.navy, borderRadius: radius.md,
    minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  editText: { color: '#FFF', fontFamily: fonts.displayExtra, fontSize: 15 },
  signout: { backgroundColor: colors.dangerBg, borderRadius: radius.lg, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  signoutText: { color: colors.danger, fontFamily: fonts.displayExtra, fontSize: 14 },
  ver: { textAlign: 'center', color: colors.placeholder, fontSize: 12, fontFamily: fonts.body, marginTop: 4 },
});
