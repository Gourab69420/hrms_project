import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppBar, Avatar, Card, Screen, SectionHeader, StatusPill } from '../../components/ui';
import { useAuth } from '../../store/AuthContext';
import { useDashboardLeaves, useDashboardStats, useLeaveAction } from '../../services/useHrms';
import {colors, radius, shadow, fonts} from '../../theme';

/**
 * PAGE 1/11 — Admin Dashboard (live).
 * All buttons work: quick actions navigate, approve/reject hits PATCH /leaves/{id}/status.
 */
export default function AdminDashboard() {
  const { signOut, backendRole } = useAuth();
  const stats = useDashboardStats();
  const leaves = useDashboardLeaves();
  const action = useLeaveAction();
  const s = stats.data;

  const onAction = (id: number, status: 'approved' | 'rejected', name: string) => {
    Alert.alert(
      `${status === 'approved' ? 'Approve' : 'Reject'} leave`,
      `${status === 'approved' ? 'Approve' : 'Reject'} ${name}'s request ${`#L-${id}`}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status === 'approved' ? 'Approve' : 'Reject',
          style: status === 'approved' ? 'default' : 'destructive',
          onPress: () =>
            action.mutate(
              { id, status },
              { onError: (e) => Alert.alert('Failed', e instanceof Error ? e.message : 'Try again') },
            ),
        },
      ],
    );
  };

  if (stats.isLoading || !s) {
    return (
      <Screen>
        <AppBar title="Dashboard" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.navy} />
          <Text style={styles.muted}>Loading dashboard…</Text>
        </View>
      </Screen>
    );
  }
  if (stats.error) {
    return (
      <Screen>
        <AppBar title="Dashboard" />
        <View style={styles.center}>
          <Text style={styles.err}>{stats.error}</Text>
          <Pressable style={styles.retry} onPress={() => stats.refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const pending = leaves.data.filter((l) => l.status === 'Pending');

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar
          title="Dashboard"
          right={
            <View style={styles.barRight}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              <Pressable
                style={styles.profileDot}
                onPress={() =>
                  Alert.alert('Account', 'Sign out?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Sign out', style: 'destructive', onPress: () => signOut().then(() => router.replace('/')) },
                  ])
                }>
                <Ionicons name="person" size={18} color="#FFF" />
              </Pressable>
            </View>
          }
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              stats.refetch();
              leaves.refetch();
            }}
          />
        }>
        <View>
          <Text style={styles.greeting}>Good morning, {s.user}</Text>
          <Text style={styles.date}>{s.date}</Text>
        </View>

        <View style={styles.grid}>
          <Card style={styles.kpi}>
            <Text style={styles.kpiLabel}>Total Staff</Text>
            <Text style={styles.kpiValue}>{s.totalStaff}</Text>
            <Text style={styles.kpiMuted}>{s.totalStaff ? 'on roster' : 'no staff yet'}</Text>
          </Card>
          <Card style={styles.kpi}>
            <Text style={styles.kpiLabel}>Present Today</Text>
            <Text style={styles.kpiValue}>{s.presentToday}</Text>
            <Text style={styles.kpiMuted}>{s.turnout}</Text>
          </Card>
          <Card style={styles.kpi}>
            <Text style={styles.kpiLabel}>Pending Leaves</Text>
            <Text style={styles.kpiValue}>{s.pendingLeaves}</Text>
            <Pressable onPress={() => router.push('/(admin)/leaves')}>
              <Text style={styles.kpiLink}>{s.pendingLeaves ? 'Review needed' : 'All clear'}</Text>
            </Pressable>
          </Card>
          <Card style={styles.kpi}>
            <Text style={styles.kpiLabel}>On Leave Today</Text>
            <Text style={styles.kpiValue}>{s.onLeave}</Text>
            <Text style={styles.kpiMuted}>{s.payrollMonth}</Text>
          </Card>
        </View>

        <SectionHeader title="Quick Actions" />
        <View style={styles.actions}>
          {(
            [
              { icon: 'person-add-outline', label: 'Add Staff', to: '/(admin)/staff/add' },
              { icon: 'calendar-outline', label: 'Review', to: '/(admin)/leaves' },
              { icon: 'time-outline', label: 'Clock', to: '/(admin)/clock' },
              { icon: 'receipt-outline', label: 'Payroll', to: '/(admin)/payroll' },
            ] as const
          ).map((a) => (
            <Pressable key={a.label} style={styles.action} onPress={() => router.push(a.to as never)}>
              <View style={styles.actionIcon}>
                <Ionicons name={a.icon as never} size={22} color={colors.navy} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Manage" />
        <View style={styles.grid}>
          {(
            [
              { icon: 'checkmark-done-outline', label: 'Approvals', to: '/(admin)/approvals' },
              { icon: 'time-outline', label: 'Regulns', to: '/(admin)/regs' },
              { icon: 'ticket-outline', label: 'Tickets', to: '/(admin)/tickets' },
              { icon: 'exit-outline', label: 'Exits', to: '/(admin)/exits' },
              { icon: 'calendar-outline', label: 'Holidays', to: '/(admin)/holidays' },
              { icon: 'megaphone-outline', label: 'Announce', to: '/(admin)/announcements' },
              { icon: 'cash-outline', label: 'Loans', to: '/(admin)/comp' },
              { icon: 'swap-horizontal-outline', label: 'Shifts', to: '/(admin)/shifts' },
              ...(backendRole === 'admin'
                ? [{ icon: 'list-outline', label: 'Audit', to: '/(admin)/audit' } as const]
                : []),
            ] as const
          ).map((a) => (
            <Pressable key={a.label} style={styles.manage} onPress={() => router.push(a.to as never)}>
              <Ionicons name={a.icon as never} size={20} color={colors.navy} />
              <Text style={styles.manageLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader
          title={`Leave Requests  ${pending.length}`}
          action={
            <Pressable onPress={() => router.push('/(admin)/leaves')}>
              <Text style={styles.link}>View all</Text>
            </Pressable>
          }
        />
        {pending.length === 0 && (
          <Card>
            <Text style={styles.muted}>No pending leave requests.</Text>
          </Card>
        )}
        {leaves.data.map((l, i) => (
          <Card key={l.id} style={styles.leave}>
            <Avatar
              initials={l.employee.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              tone={i}
            />
            <Pressable style={styles.leaveMid} onPress={() => router.push('/(admin)/leaves')}>
              <Text style={styles.leaveName}>{l.employee}</Text>
              <Text style={styles.leaveSub}>
                {l.type} • {l.days}
              </Text>
            </Pressable>
            {l.status === 'Pending' ? (
              <View style={styles.leaveBtns}>
                <Pressable style={styles.reject} onPress={() => onAction(l.id, 'rejected', l.employee)}>
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
                <Pressable style={styles.approve} onPress={() => onAction(l.id, 'approved', l.employee)}>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                </Pressable>
              </View>
            ) : (
              <StatusPill status={l.status} />
            )}
          </Card>
        ))}

        <Pressable onPress={() => router.push('/(admin)/clock')}>
          <Card style={styles.attRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.blueDot} />
              <Text style={styles.attTitle}>Attendance{'\n'}Today</Text>
            </View>
            <Text style={styles.attNum}>
              {s.onsite} <Text style={styles.attLbl}>Present</Text>
            </Text>
            <Text style={styles.attNum}>
              {s.onLeave} <Text style={styles.attLbl}>Leave</Text>
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        </Pressable>
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  barRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  muted: { fontSize: 13, color: colors.muted, fontFamily: fonts.body, },
  err: { fontSize: 14, color: colors.dangerDot, textAlign: 'center', paddingHorizontal: 24, fontFamily: fonts.body, },
  retry: { backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  retryText: { color: '#FFF', fontFamily: fonts.display },
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 4 },
  greeting: { fontSize: 26, fontFamily: fonts.displayExtra, color: colors.text, letterSpacing: -0.4 },
  date: { fontSize: 14, color: colors.muted, marginTop: 2, fontFamily: fonts.body, },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  manage: {
    width: '31%', flexGrow: 1, backgroundColor: '#FFF', borderColor: colors.border, borderWidth: 1,
    borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 6,
  },
  manageLabel: { fontSize: 11, fontFamily: fonts.display, color: colors.text },
  kpi: { width: '48%', flexGrow: 1, gap: 4 },
  kpiLabel: { fontSize: 13, color: colors.muted, fontFamily: fonts.medium },
  kpiValue: { fontSize: 30, fontFamily: fonts.displayExtra, color: colors.text },
  kpiLink: { fontSize: 13, color: colors.royal, fontFamily: fonts.semiBold },
  kpiMuted: { fontSize: 13, color: colors.muted, fontFamily: fonts.medium },
  actions: { flexDirection: 'row', gap: 10 },
  action: {
    flex: 1, backgroundColor: '#FFF', borderColor: colors.border, borderWidth: 1,
    borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 8, ...shadow.card,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.royalSoft, alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 12, fontFamily: fonts.display, color: colors.text },
  link: { fontSize: 13, color: colors.royal, fontFamily: fonts.display },
  leave: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  leaveMid: { flex: 1 },
  leaveName: { fontSize: 15, fontFamily: fonts.display, color: colors.text },
  leaveSub: { fontSize: 13, color: colors.muted, marginTop: 2, fontFamily: fonts.body, },
  leaveBtns: { flexDirection: 'row', gap: 8 },
  reject: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.royalSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  approve: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  attRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  blueDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.royal },
  attTitle: { fontSize: 15, fontFamily: fonts.displayExtra, color: colors.text },
  attNum: { fontSize: 15, fontFamily: fonts.displayExtra, color: colors.text },
  attLbl: { fontSize: 12, fontFamily: fonts.medium, color: colors.muted },
});
