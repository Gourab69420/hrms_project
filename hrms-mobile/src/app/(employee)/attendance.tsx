import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
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
import { AppBar, Card, Screen, StatusPill } from '../../components/ui';
import { useMyAttendance, usePunch } from '../../services/useHrms';
import {colors, radius, fonts} from '../../theme';

/** PAGE 7/11 — My Attendance. One button: tap to punch in, tap again to punch out. */
export default function EmpAttendance() {
  const { data, todays, isLoading, error, refetch } = useMyAttendance();
  const punch = usePunch();
  const [exporting, setExporting] = useState(false);

  const doPunch = () => {
    punch.mutate(undefined, {
      onSuccess: () => refetch(),
      onError: (e) => {
        const msg = e instanceof Error ? e.message : 'Try again';
        Alert.alert(
          /network/i.test(msg) ? 'Saved offline' : 'Punch failed',
          /network/i.test(msg) ? 'No connection — your punch will sync automatically.' : msg,
        );
        refetch();
      },
    });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = [['date', 'check_in', 'check_out', 'status']];
      for (const r of data) rows.push([r.date, r.check_in ?? '', r.check_out ?? '', r.status]);
      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
      const uri = `${FileSystem.cacheDirectory}my-attendance.csv`;
      await FileSystem.writeAsStringAsync(uri, csv);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      else Alert.alert('Exported', `Saved to ${uri}`);
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setExporting(false);
    }
  };

  const punchedIn = !!todays && !todays.check_out;
  const presentDays = data.filter((r) => r.status === 'present' || r.status === 'late').length;

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Attendance" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        <View style={styles.head}>
          <View>
            <Text style={styles.eyebrow}>MY TRACKER</Text>
            <Text style={styles.date}>{new Date().toDateString()}</Text>
          </View>
        </View>

        <Card>
          <View style={styles.liveTop}>
            <View style={styles.liveRow}><View style={[styles.liveDot, { backgroundColor: !todays ? '#CBD5E1' : punchedIn ? '#10B981' : '#2563EB' }]} /><Text style={styles.liveText}>{todays ? (punchedIn ? 'PUNCHED IN' : 'DAY COMPLETE') : 'NOT PUNCHED IN'}</Text></View>
            {todays && <StatusPill status={todays.status === 'late' ? 'Late' : 'Present'} />}
          </View>
          {todays && (
            <Text style={styles.punched}>
              In {todays.check_in?.slice(11, 16) ?? '—'}
              {todays.check_out ? `  •  Out ${todays.check_out.slice(11, 16)}` : '  •  tap below to punch out'}
            </Text>
          )}
          <Pressable style={styles.punchBtn} onPress={doPunch} disabled={punch.isPending || (!!todays && !!todays.check_out)}>
            {punch.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.punchRow}>
                <Ionicons
                  name={!!todays && !!todays.check_out ? 'checkmark-circle-outline' : punchedIn ? 'log-out-outline' : 'log-in-outline'}
                  size={18}
                  color="#FFF"
                />
                <Text style={styles.punchText}>
                  {!!todays && !!todays.check_out ? 'Done for today' : punchedIn ? 'Punch Out' : 'Punch In'}
                </Text>
              </View>
            )}
          </Pressable>
          <Text style={styles.geo}>Tap once to mark attendance — check-in and check-out on the same button.</Text>
        </Card>

        <View style={styles.minis}>
          <Card style={styles.mini}>
            <Text style={styles.miniT}>Days Present</Text>
            <Text style={styles.miniV}>{presentDays}</Text>
          </Card>
          <Card style={styles.mini}>
            <Text style={styles.miniT}>Records</Text>
            <Text style={styles.miniV}>{data.length}</Text>
          </Card>
        </View>

        <View style={styles.logHead}>
          <Text style={styles.section}>Attendance Log</Text>
          <Pressable onPress={exportCsv} disabled={exporting}>
            <View style={styles.exportRow}>
              <Ionicons name="download-outline" size={14} color={colors.royal} />
              <Text style={styles.export}>{exporting ? '…' : 'Export Log'}</Text>
            </View>
          </Pressable>
        </View>
        {isLoading && <ActivityIndicator color={colors.navy} style={{ marginVertical: 16 }} />}
        {error && (
          <Card>
            <Text style={styles.err}>{error}</Text>
          </Card>
        )}
        {!isLoading && !error && data.length === 0 && (
          <Card>
            <Text style={styles.muted}>No attendance yet. Punch in to mark your first day.</Text>
          </Card>
        )}
        {data.map((l) => (
          <Card key={l.id} style={styles.log}>
            <View style={styles.logLeft}>
              <Text style={styles.logDate}>{l.date}</Text>
              <Text style={styles.logTimes}>
                {l.check_in?.slice(11, 16) ?? '--:--'}
                {l.check_out ? `  •  ${l.check_out.slice(11, 16)}` : '  •  open'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <StatusPill status={l.status === 'late' ? 'Late' : l.status === 'present' ? 'Present' : 'On Leave'} />
            </View>
          </Card>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 11, fontFamily: fonts.display, color: colors.muted, letterSpacing: 1 },
  date: { fontSize: 17, fontFamily: fonts.displayExtra, color: colors.text, marginTop: 2 },
  liveTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  liveText: { fontFamily: fonts.displayExtra, fontSize: 13, color: colors.text },
  punchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  punched: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 8, fontFamily: fonts.body, },
  punchBtn: { backgroundColor: colors.navy, borderRadius: radius.sm, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  punchText: { color: '#FFF', fontFamily: fonts.displayExtra, fontSize: 15 },
  geo: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: 10, fontFamily: fonts.body, },
  minis: { flexDirection: 'row', gap: 10 },
  mini: { flex: 1, gap: 2 },
  miniT: { fontSize: 11, color: colors.muted, fontFamily: fonts.body, },
  miniV: { fontSize: 20, fontFamily: fonts.displayExtra, color: colors.text },
  logHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  section: { fontSize: 16, fontFamily: fonts.displayExtra, color: colors.text, marginTop: 6 },
  export: { fontSize: 13, color: colors.royal, fontFamily: fonts.display },
  log: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logLeft: { gap: 3 },
  logDate: { fontSize: 14, fontFamily: fonts.displayExtra, color: colors.text, fontVariant: ['tabular-nums'] },
  logTimes: { fontSize: 12, color: colors.muted, fontVariant: ['tabular-nums'], fontFamily: fonts.body, },
  muted: { color: colors.muted, textAlign: 'center', fontFamily: fonts.body, },
  err: { color: colors.dangerDot, fontFamily: fonts.body, },
});
