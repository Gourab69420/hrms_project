import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppBar, Avatar, Card, Screen, StatusPill } from '../../../components/ui';
import { api } from '../../../services/api';
import { useEmployee } from '../../../services/useHrms';
import {colors, radius, fonts} from '../../../theme';
import { useEffect, useState } from 'react';

/** Staff detail — live employee + counts. Call / Email buttons use device linking. */
export default function StaffDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const empId = Number(id);
  const { data: e, isLoading, error } = useEmployee(empId);
  const [counts, setCounts] = useState<{ att: number; leaves: number } | null>(null);

  useEffect(() => {
    if (!Number.isFinite(empId)) return;
    (async () => {
      try {
        const [a, l] = await Promise.all([
          api.get(`/attendance/employee/${empId}`),
          api.get('/leaves/'),
        ]);
        setCounts({ att: (a.data as unknown[]).length, leaves: (l.data as { employee_id: number }[]).filter((x) => x.employee_id === empId).length });
      } catch {
        /* non-fatal */
      }
    })();
  }, [empId]);

  if (isLoading)
    return (
      <Screen>
        <AppBar title="Staff" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      </Screen>
    );
  if (error || !e)
    return (
      <Screen>
        <AppBar title="Staff" />
        <View style={styles.center}>
          <Text style={styles.err}>{error ?? 'Employee not found'}</Text>
          <Pressable style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Go back</Text>
          </Pressable>
        </View>
      </Screen>
    );

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title={e.code} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card style={styles.head}>
          <Avatar initials={`${e.first_name[0] ?? ''}${e.last_name[0] ?? ''}`.toUpperCase()} tone={0} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {e.first_name} {e.last_name}
            </Text>
            <Text style={styles.pos}>{e.position || '—'}</Text>
            <StatusPill status={e.status} />
          </View>
        </Card>

        <Card>
          <Row label="Email" value={e.email} />
          <Row label="Phone" value={e.phone || '—'} />
          <Row label="Department" value={e.department} />
          <Row label="Date of joining" value={e.hire_date || '—'} />
          {counts && (
            <>
              <Row label="Attendance records" value={String(counts.att)} />
              <Row label="Leave applications" value={String(counts.leaves)} />
            </>
          )}
        </Card>

        <View style={styles.btns}>
          {!!e.phone && (
            <Pressable style={styles.btn} onPress={() => Linking.openURL(`tel:${e.phone}`)}>
              <Ionicons name="call-outline" size={18} color="#FFF" />
              <Text style={styles.btnText}>Call</Text>
            </Pressable>
          )}
          <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => Linking.openURL(`mailto:${e.email}`)}>
            <Ionicons name="mail-outline" size={18} color={colors.navy} />
            <Text style={[styles.btnText, { color: colors.navy }]}>Email</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.danger}
          onPress={() =>
            Alert.alert('Deactivate', `Deactivate ${e.first_name}? They lose access.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Deactivate',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await api.patch(`/employees/${e.id}`, { is_active: false });
                    Alert.alert('Done', 'Employee deactivated.', [{ text: 'OK', onPress: () => router.back() }]);
                  } catch (err) {
                    Alert.alert('Failed', err instanceof Error ? err.message : 'Try again');
                  }
                },
              },
            ])
          }>
          <Text style={styles.dangerText}>Deactivate employee</Text>
        </Pressable>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  err: { color: colors.dangerDot, fontFamily: fonts.body, },
  body: { paddingHorizontal: 16, gap: 12, paddingBottom: 24 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  name: { fontSize: 18, fontFamily: fonts.displayExtra, color: colors.text },
  pos: { fontSize: 13, color: colors.muted, marginVertical: 3, fontFamily: fonts.body, },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  lbl: { fontSize: 12, color: colors.muted, fontFamily: fonts.body, },
  val: { fontSize: 13, fontFamily: fonts.display, color: colors.text, maxWidth: '60%', textAlign: 'right' },
  btns: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1, flexDirection: 'row', backgroundColor: colors.navy, borderRadius: radius.md,
    minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnOutline: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.navy },
  btnText: { color: '#FFF', fontFamily: fonts.displayExtra },
  danger: { alignItems: 'center', padding: 12 },
  dangerText: { color: colors.dangerDot, fontFamily: fonts.display },
});
