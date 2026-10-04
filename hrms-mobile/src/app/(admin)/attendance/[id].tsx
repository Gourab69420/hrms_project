import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppBar, Avatar, Card, Screen, StatusPill, initialsOf, toneFor } from '../../../components/ui';
import { DOT, Legend, MonthCalendar } from '../../../components/MonthCalendar';
import { api, type BackendAttendance, type BackendLeave } from '../../../services/api';
import { qError, useEmployees, useHolidays } from '../../../services/useHrms';
import { buildMarks, monthOf, todayIso } from '../../../services/marks';
import { colors, fonts } from '../../../theme';

/** One employee's attendance calendar (opened from a Clock roster tile). */
export default function EmployeeAttendance() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const empId = Number(id);
  const today = todayIso();
  const [month, setMonth] = useState(monthOf(today));
  const [selected, setSelected] = useState<string | null>(today);

  const { data: emps } = useEmployees();
  const emp = emps.find((e) => e.id === empId);
  const attQ = useQuery({
    queryKey: ['attendance-emp', empId],
    queryFn: () => api.get<BackendAttendance[]>(`/attendance/employee/${empId}`).then((r) => r.data),
    enabled: Number.isFinite(empId),
  });
  const leavesQ = useQuery({
    queryKey: ['leaves-all'],
    queryFn: () => api.get<BackendLeave[]>('/leaves/').then((r) => r.data),
  });
  const { data: holidays } = useHolidays();

  const records = attQ.data ?? [];
  const marked = useMemo(
    () =>
      buildMarks(
        month,
        records,
        (leavesQ.data ?? [])
          .filter((l) => l.employee_id === empId && l.status === 'approved')
          .map((l) => ({ start: l.start_date, end: l.end_date })),
        holidays.map((h) => h.date),
        today,
      ),
    [month, records, leavesQ.data, holidays, empId, today],
  );
  const selRec = selected ? records.find((r) => r.date === selected) : null;
  const monthRecs = useMemo(
    () => records.filter((r) => r.date.slice(0, 7) === month).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [records, month],
  );

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title={emp ? `${emp.first_name} ${emp.last_name}` : `EMP-${empId}`} />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              attQ.refetch();
              leavesQ.refetch();
            }}
          />
        }>
        {emp && (
          <Card style={styles.head}>
            <Avatar initials={initialsOf(`${emp.first_name} ${emp.last_name}`)} tone={toneFor(emp.id)} />
            <View style={styles.mid}>
              <Text style={styles.name}>
                {emp.first_name} {emp.last_name}
              </Text>
              <Text style={styles.sub}>
                {emp.code} • {emp.department}
              </Text>
            </View>
          </Card>
        )}
        {(attQ.isLoading || leavesQ.isLoading) && <ActivityIndicator color={colors.navy} style={{ marginTop: 8 }} />}
        {(attQ.error || leavesQ.error) && (
          <Card>
            <Text style={styles.err}>{qError((attQ.error ?? leavesQ.error) as unknown)}</Text>
          </Card>
        )}

        <Text style={styles.h}>Calendar</Text>
        <MonthCalendar marked={marked} selected={selected} maxDate={today} onMonth={setMonth} onDay={(d) => { setSelected(d); setMonth(monthOf(d)); }} />
        <Legend
          items={[
            { color: DOT.present, label: 'Present' },
            { color: DOT.late, label: 'Late' },
            { color: DOT.leave, label: 'Leave' },
            { color: DOT.holiday, label: 'Holiday' },
            { color: DOT.absent, label: 'Absent' },
          ]}
        />
        {selected && (
          <Card>
            <View style={styles.selTop}>
              <Text style={styles.selDate}>{selected}</Text>
              {selRec ? (
                <StatusPill status={selRec.status === 'late' ? 'Late' : selRec.status === 'present' ? 'Present' : 'On Leave'} />
              ) : (
                <Text style={styles.selNone}>
                  {holidays.some((h) => h.date === selected) ? 'Holiday' : 'No record'}
                </Text>
              )}
            </View>
            {selRec && (
              <Text style={styles.selTimes}>
                In {selRec.check_in?.slice(11, 16) ?? '--:--'}
                {selRec.check_out ? `  •  Out ${selRec.check_out.slice(11, 16)}` : '  •  open'}
              </Text>
            )}
          </Card>
        )}

        <Text style={styles.h}>Log — {month}</Text>
        {monthRecs.map((r) => (
          <Card key={r.id} style={styles.log}>
            <View>
              <Text style={styles.logDate}>{r.date}</Text>
              <Text style={styles.logTimes}>
                {r.check_in?.slice(11, 16) ?? '--:--'}
                {r.check_out ? `  •  ${r.check_out.slice(11, 16)}` : '  •  open'}
              </Text>
            </View>
            <StatusPill status={r.status === 'late' ? 'Late' : r.status === 'present' ? 'Present' : 'On Leave'} />
          </Card>
        ))}
        {monthRecs.length === 0 && !attQ.isLoading && (
          <Card>
            <Text style={styles.muted}>No records this month.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mid: { flex: 1 },
  name: { fontSize: 16, fontFamily: fonts.displayExtra, color: colors.text },
  sub: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  h: { fontSize: 15, fontFamily: fonts.displayExtra, color: colors.text, marginTop: 4 },
  selTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selDate: { fontSize: 15, fontFamily: fonts.displayExtra, color: colors.text, fontVariant: ['tabular-nums'] },
  selNone: { fontSize: 12, fontFamily: fonts.body, color: colors.muted },
  selTimes: { fontSize: 13, fontFamily: fonts.body, color: colors.text, marginTop: 6, fontVariant: ['tabular-nums'] },
  log: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logDate: { fontSize: 14, fontFamily: fonts.displayExtra, color: colors.text, fontVariant: ['tabular-nums'] },
  logTimes: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2, fontVariant: ['tabular-nums'] },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
