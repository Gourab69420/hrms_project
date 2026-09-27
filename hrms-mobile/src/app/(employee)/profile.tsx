import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar, Card, Screen, StatusPill } from '../../components/ui';
import { useAuth } from '../../store/AuthContext';
import { useMyProfile } from '../../services/useHrms';
import {colors, radius, fonts} from '../../theme';

/** PAGE 11/11 — Profile (live from GET /employees/me + /auth/me). */
export default function EmpProfile() {
  const { signOut, user } = useAuth();
  const { data: e, isLoading, error, refetch } = useMyProfile();

  if (isLoading)
    return (
      <Screen>
        <AppBar title="Profile" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      </Screen>
    );
  if (error || !e)
    return (
      <Screen>
        <AppBar title="Profile" />
        <View style={styles.center}>
          <Text style={styles.err}>{error ?? 'No linked employee profile'}</Text>
          <Pressable
            style={styles.signout}
            onPress={async () => {
              await signOut();
              router.replace('/');
            }}>
            <Text style={styles.signoutText}>Sign Out</Text>
          </Pressable>
        </View>
      </Screen>
    );

  const rows: { icon: string; label: string; value: string }[] = [
    { icon: 'id-card-outline', label: 'Employee ID', value: `EMP-${String(e.id).padStart(4, '0')}` },
    { icon: 'person-outline', label: 'Full Name', value: `${e.first_name} ${e.last_name}` },
    { icon: 'at-circle-outline', label: 'Username', value: user?.username ?? '—' },
    { icon: 'at-outline', label: 'Work Email', value: e.email },
    { icon: 'call-outline', label: 'Phone Number', value: e.phone ?? '—' },
    { icon: 'briefcase-outline', label: 'Position', value: e.position ?? '—' },
    { icon: 'calendar-outline', label: 'Date of Joining', value: e.hire_date ?? '—' },
  ];

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Profile" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        <Card>
          <View style={styles.id}>
            <View style={styles.avatar}>
              <Text style={styles.avatarT}>
                {(e.first_name[0] ?? '').toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {e.first_name} {e.last_name}{' '}
                <Text style={styles.code}>● EMP-{String(e.id).padStart(3, '0')}</Text>
              </Text>
              <Text style={styles.role}>{e.position ?? ''}</Text>
              <Text style={styles.active}>● {e.is_active ? 'Active Employee' : 'Inactive'}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.contactTitle}>Contact & Employment</Text>
          {rows.map((r) => (
            <View key={r.label} style={styles.field}>
              <View style={styles.fIcon}>
                <Ionicons name={r.icon as never} size={18} color={colors.navy} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fLbl}>{r.label}</Text>
                <Text style={styles.fVal}>{r.value}</Text>
              </View>
            </View>
          ))}
          <View style={styles.field}>
            <View style={styles.fIcon}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fLbl}>Employment Status</Text>
              <Text style={[styles.fVal, { color: colors.royal }]}>{e.is_active ? 'Active' : 'Inactive'}</Text>
            </View>
            {e.is_active && <StatusPill status="Active" />}
          </View>
        </Card>

        <Pressable
          style={styles.signout}
          onPress={async () => {
            await signOut();
            router.replace('/');
          }}>
          <Text style={styles.signoutText}>⇥   Sign Out of Account</Text>
        </Pressable>
        <Text style={styles.ver}>Workforce OS • v2.4.1 (Build 402){user ? ` • ${user.username}` : ''}</Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  err: { color: colors.dangerDot, fontFamily: fonts.body, },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  id: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarT: { color: '#FFF', fontSize: 26, fontFamily: fonts.displayExtra },
  name: { fontSize: 17, fontFamily: fonts.displayExtra, color: colors.text },
  code: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.muted },
  role: { fontSize: 13, color: colors.muted, marginTop: 2, fontFamily: fonts.body, },
  active: { fontSize: 13, color: colors.navy, fontFamily: fonts.display, marginTop: 3 },
  contactTitle: { fontSize: 16, fontFamily: fonts.displayExtra, color: colors.text, marginBottom: 4 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  fIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.royalSoft, alignItems: 'center', justifyContent: 'center' },
  fLbl: { fontSize: 12, color: colors.muted, fontFamily: fonts.body, },
  fVal: { fontSize: 14, fontFamily: fonts.display, color: colors.text, marginTop: 1 },
  signout: { backgroundColor: colors.dangerBg, borderRadius: radius.lg, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  signoutText: { color: colors.danger, fontFamily: fonts.displayExtra, fontSize: 14 },
  ver: { textAlign: 'center', color: colors.placeholder, fontSize: 12, marginTop: 4, fontFamily: fonts.body, },
});
