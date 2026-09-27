import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppBar, Card, Screen } from '../../components/ui';
import { useEmployeeHome, useMyAttendance, usePunch } from '../../services/useHrms';
import {colors, radius, shadow, fonts} from '../../theme';

/** PAGE 6/11 — Employee Home (live). Punch button marks attendance via POST /attendance/punch. */
export default function EmpHome() {
  const home = useEmployeeHome();
  const att = useMyAttendance();
  const punch = usePunch();
  const d = home.data;

  const doPunch = () => {
    punch.mutate(undefined, {
      onSuccess: () => att.refetch(),
      onError: (e) => Alert.alert('Punch failed', e instanceof Error ? e.message : 'Try again'),
    });
  };

  const punchedIn = !!att.todays && !att.todays.check_out;

  if ((home.isLoading && !d) || (att.isLoading && !att.todays)) {
    return (
      <Screen>
        <AppBar title="Home" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Home" right={<Ionicons name="notifications-outline" size={22} color={colors.muted} />} />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => att.refetch()} />}>
        <Text style={styles.greet}>Hello, {d.user}</Text>
        <Text style={styles.date}>{d.date}</Text>

        <Card style={styles.att}>
          <View style={styles.clockWrap}>
            <Ionicons name="time-outline" size={22} color={colors.navy} />
          </View>
          <Text style={styles.attTitle}>Today's Attendance</Text>
          <Text style={styles.attSub}>
            {att.todays
              ? att.todays.check_out
                ? `In ${att.todays.check_in?.slice(11, 16) ?? ''} • Out ${att.todays.check_out.slice(11, 16)}`
                : `Punched in at ${att.todays.check_in?.slice(11, 16) ?? ''}`
              : 'No attendance recorded for today.'}
          </Text>
          <Pressable style={styles.punch} onPress={doPunch} disabled={punch.isPending}>
            {punch.isPending ? (
              <ActivityIndicator size="small" color={colors.navy} />
            ) : (
              <>
                <View style={[styles.punchDot, punchedIn && { backgroundColor: colors.successDot }]} />
                <Text style={styles.punchText}>{punchedIn ? 'Punch Out Now' : 'Punch In Now'}</Text>
              </>
            )}
          </Pressable>
        </Card>

        <View style={styles.metrics}>
          <Card style={styles.metric}>
            <Text style={styles.metricN}>{d.pendingLeaves}</Text>
            <Text style={styles.metricL}>Pending Leaves</Text>
          </Card>
          <Card style={styles.metric}>
            <Text style={[styles.metricN, { fontSize: 20 }]}>{d.lastNetSalary}</Text>
            <Text style={styles.metricL}>Last Net Salary</Text>
          </Card>
        </View>

        <Text style={styles.section}>Quick Actions</Text>
        <View style={{ gap: 10 }}>
          {(
            [
              { icon: 'calendar-outline', label: 'My Attendance', to: '/(employee)/attendance' },
              { icon: 'add', label: 'Apply Leave', to: '/(employee)/apply-leave' },
              { icon: 'checkmark-circle-outline', label: 'My Leaves', to: '/(employee)/leaves' },
              { icon: 'receipt-outline', label: 'My Payroll', to: '/(employee)/payroll' },
            ] as const
          ).map((a) => (
            <Pressable key={a.label} style={styles.action} onPress={() => router.push(a.to as never)}>
              <View style={styles.actionIcon}>
                <Ionicons name={a.icon as never} size={20} color={colors.navy} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
            </Pressable>
          ))}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingTop: 4 },
  greet: { fontSize: 26, fontFamily: fonts.displayExtra, color: colors.text },
  date: { fontSize: 14, color: colors.placeholder, marginTop: 2, fontFamily: fonts.body, },
  att: { alignItems: 'center', marginTop: 14, paddingVertical: 22 },
  clockWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.royalSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  attTitle: { fontSize: 18, fontFamily: fonts.displayExtra, color: colors.text },
  attSub: { fontSize: 14, color: colors.placeholder, fontStyle: 'italic', marginTop: 4, textAlign: 'center', fontFamily: fonts.bodyItalic, },
  punch: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.royalSoft, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9, marginTop: 12, minHeight: 40 },
  punchDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warningDot },
  punchText: { color: colors.navy, fontFamily: fonts.display, fontSize: 13 },
  metrics: { flexDirection: 'row', gap: 12, marginTop: 14 },
  metric: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  metricN: { fontSize: 30, fontFamily: fonts.displayExtra, color: colors.royal, fontVariant: ['tabular-nums'] },
  metricL: { fontSize: 12, color: colors.placeholder, marginTop: 4, fontFamily: fonts.body, },
  section: { fontSize: 17, fontFamily: fonts.displayExtra, color: colors.text, marginTop: 18, marginBottom: 10 },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF',
    borderColor: colors.border, borderWidth: 1, borderRadius: radius.lg, padding: 14, ...shadow.card,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.royalSoft, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { flex: 1, fontSize: 14, fontFamily: fonts.display, color: colors.royal },
});
