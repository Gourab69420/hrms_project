import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {AppBar, Avatar, Card, Screen, SearchBar, StatusPill, initialsOf, toneFor} from '../../components/ui';
import { api, listAllAttendance, listEmployees } from '../../services/api';
import { qError, useDepartments } from '../../services/useHrms';
import {colors, radius, fonts} from '../../theme';

/**
 * PAGE 3/11 — Attendance Tracker (live roster).
 * Search filters locally; Export downloads a real CSV of today's roster.
 */
export default function Clock() {
  const [q, setQ] = useState('');
  const [exporting, setExporting] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [closing, setClosing] = useState(false);
  const { data: depts } = useDepartments();
  const empQ = useQuery({ queryKey: ['employees'], queryFn: () => listEmployees() });
  const attQ = useQuery({ queryKey: ['attendance-all'], queryFn: listAllAttendance });
  const deptById = new Map((depts ?? []).map((d) => [d.id, d.name]));
  const today = new Date().toISOString().slice(0, 10);

  const byEmp = new Map((attQ.data ?? []).filter((a) => a.date === today).map((a) => [a.employee_id, a]));
  const emps = (empQ.data ?? []).filter(
    (e) =>
      !q.trim() ||
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q.toLowerCase()) ||
      String(e.id).includes(q.trim()),
  );

  const present = (attQ.data ?? []).filter(
    (a) => a.date === today && (a.status === 'present' || a.status === 'late'),
  ).length;
  const late = (attQ.data ?? []).filter((a) => a.date === today && a.status === 'late').length;
  const total = empQ.data?.length ?? 0;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = [['employee', 'code', 'check_in', 'check_out', 'status']];
      for (const e of emps) {
        const a = byEmp.get(e.id);
        rows.push([
          `${e.first_name} ${e.last_name}`,
          `EMP-${e.id}`,
          a?.check_in ?? '',
          a?.check_out ?? '',
          a?.status ?? 'absent',
        ]);
      }
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const uri = `${FileSystem.cacheDirectory}attendance-${today}.csv`;
      await FileSystem.writeAsStringAsync(uri, csv);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      else Alert.alert('Exported', `Saved to ${uri}`);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setExporting(false);
    }
  };

  const loading = empQ.isLoading || attQ.isLoading;
  const error = empQ.error ? qError(empQ.error) : attQ.error ? qError(attQ.error) : null;

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Attendance" />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.eyebrow}>DAILY ATTENDANCE ROSTER</Text>
          <View style={styles.headRow}>
            <Text style={styles.headTitle}>Today's Workforce</Text>
            <View style={styles.pct}>
              <Text style={styles.pctText}>
                {total ? `${Math.round((present / total) * 100)}% In` : '—'}
              </Text>
            </View>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLbl}>Present</Text>
              <Text style={[styles.statVal, { color: colors.royal }]}>
                {present}
                <Text style={styles.statDim}>/{total}</Text>
              </Text>
            </View>
            <View style={[styles.stat, styles.statBorder]}>
              <Text style={styles.statLbl}>Late</Text>
              <Text style={[styles.statVal, { color: colors.navy }]}>{late}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLbl}>Absent</Text>
              <Text style={[styles.statVal, { color: colors.dangerDot }]}>{Math.max(total - present, 0)}</Text>
            </View>
          </View>
        </Card>

        <SearchBar value={q} onChange={setQ} />

        <View style={styles.listHead}>
          <View>
            <Text style={styles.listTitle}>Employee Attendance Roster</Text>
            <Text style={styles.listSub}>{total} Total Staff Registered</Text>
          </View>
        </View>

        {loading && <ActivityIndicator color={colors.navy} style={{ marginVertical: 16 }} />}
        {error && (
          <Card>
            <Text style={styles.err}>{error}</Text>
          </Card>
        )}
        {emps.map((e, i) => {
          const a = byEmp.get(e.id);
          const status = !a ? 'Absent' : a.status === 'present' ? 'Present' : a.status === 'late' ? 'Late' : 'On Leave';
          const shift =
            a?.check_in && a?.check_out
              ? `${a.check_in.slice(11, 16)} – ${a.check_out.slice(11, 16)}`
              : a?.check_in
                ? `In ${a.check_in.slice(11, 16)}`
                : '— not punched —';
          return (
            <Card key={e.id} style={styles.row}>
              <Avatar initials={initialsOf(`${e.first_name} ${e.last_name}`)} tone={i} />
              <View style={styles.rowMid}>
                <Text style={styles.rowName}>
                  {e.first_name} {e.last_name}
                </Text>
                <Text style={styles.rowCode}>
                  EMP-{String(e.id).padStart(4, '0')} • {deptById.get(e.department_id ?? -1) ?? '—'}
                </Text>
                <Text style={styles.rowShift}>{shift}</Text>
              </View>
              <StatusPill status={status} />
            </Card>
          );
        })}
        {!loading && !error && emps.length === 0 && (
          <Card>
            <Text style={styles.muted}>No employees match.</Text>
          </Card>
        )}

        <Card style={styles.export}>
          <View>
            <Text style={styles.exportTitle}>Export Roster & Logs</Text>
            <Text style={styles.exportSub}>Download daily CSV • {total} records</Text>
          </View>
          <Pressable style={styles.exportBtn} onPress={exportCsv} disabled={exporting}>
            <Text style={styles.exportBtnText}>{exporting ? '…' : 'Export ⤓'}</Text>
          </Pressable>
        </Card>

        <Card style={styles.export}>
          <View>
            <Text style={styles.exportTitle}>Absentee Alerts</Text>
            <Text style={styles.exportSub}>Notify managers of staff with no punch-in (after 10:30)</Text>
          </View>
          <Pressable
            style={styles.exportBtn}
            disabled={alerting}
            onPress={async () => {
              setAlerting(true);
              try {
                const r = await api.post('/alerts/absentee');
                Alert.alert(
                  'Alerts sent',
                  r.data.skipped ? 'Skipped (holiday).' : `${r.data.notified} manager(s) notified, ${r.data.missing} missing.`,
                );
              } catch (e) {
                Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
              } finally {
                setAlerting(false);
              }
            }}>
            <Text style={styles.exportBtnText}>{alerting ? '…' : 'Send 🔔'}</Text>
          </Pressable>
        </Card>

        <Card style={styles.export}>
          <View>
            <Text style={styles.exportTitle}>Close Ended Shifts</Text>
            <Text style={styles.exportSub}>Auto punch-out everyone past shift end (no duplicates)</Text>
          </View>
          <Pressable
            style={styles.exportBtn}
            disabled={closing}
            onPress={async () => {
              setClosing(true);
              try {
                const r = await api.post('/attendance/auto-punch-out');
                Alert.alert('Done', `Closed ${r.data.closed} open session(s).`);
              } catch (e) {
                Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
              } finally {
                setClosing(false);
              }
            }}>
            <Text style={styles.exportBtnText}>{closing ? '…' : 'Run 🌙'}</Text>
          </Pressable>
        </Card>
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  eyebrow: { fontSize: 11, fontFamily: fonts.display, color: colors.muted, letterSpacing: 1 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  headTitle: { fontSize: 17, fontFamily: fonts.display, color: colors.text },
  pct: { backgroundColor: colors.royalSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  pctText: { color: colors.navy, fontFamily: fonts.display, fontSize: 12 },
  stats: { flexDirection: 'row', backgroundColor: colors.royalSoft, borderRadius: radius.md, marginTop: 12, paddingVertical: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.royalBorder },
  statLbl: { fontSize: 12, color: colors.muted, fontFamily: fonts.body, },
  statVal: { fontSize: 18, fontFamily: fonts.displayExtra, marginTop: 2 },
  statDim: { fontSize: 12, fontFamily: fonts.body, color: colors.muted },
  listHead: { marginTop: 2 },
  listTitle: { fontSize: 15, fontFamily: fonts.display, color: colors.text },
  listSub: { fontSize: 12, color: colors.muted, marginTop: 2, fontFamily: fonts.body, },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowMid: { flex: 1 },
  rowName: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  rowCode: { fontSize: 11, color: colors.muted, marginTop: 1, fontFamily: fonts.body, },
  rowShift: { fontSize: 12, color: colors.text, marginTop: 3, fontVariant: ['tabular-nums'], fontFamily: fonts.body, },
  muted: { color: colors.muted, textAlign: 'center', fontFamily: fonts.body, },
  err: { color: colors.dangerDot, fontFamily: fonts.body, },
  export: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exportTitle: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  exportSub: { fontSize: 12, color: colors.muted, marginTop: 2, fontFamily: fonts.body, },
  exportBtn: { backgroundColor: '#FFF', borderColor: colors.border, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10 },
  exportBtnText: { color: colors.navy, fontFamily: fonts.display, fontSize: 13 },
});
