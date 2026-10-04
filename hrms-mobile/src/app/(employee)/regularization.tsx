import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppBar, Card, Screen, StatusPill } from '../../components/ui';
import { createReg, getMyRegs } from '../../services/api';
import { qError } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** "I forgot to punch" — request corrected times, manager/HR approves into attendance. */
const fmtDT = (d: Date) =>
  `${d.toISOString().slice(0, 10)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;

export default function Regularization() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['regs-my'], queryFn: getMyRegs });
  const [day, setDay] = useState(new Date());
  const [showDay, setShowDay] = useState(false);
  const [kind, setKind] = useState<'in' | 'out' | 'both'>('both');
  const [time, setTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [showTime, setShowTime] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const at = (base: Date, t: Date) => {
    const d = new Date(base);
    d.setHours(t.getHours(), t.getMinutes(), 0, 0);
    return d;
  };

  const submit = async () => {
    if (!reason.trim()) {
      Alert.alert('Missing reason', 'Tell your manager what happened.');
      return;
    }
    setBusy(true);
    try {
      const payload: { date: string; req_check_in?: string; req_check_out?: string; reason?: string } = {
        date: day.toISOString().slice(0, 10),
        reason: reason.trim(),
      };
      // Backend quirk: req_* are datetimes — send the same picked wall-time for the chosen legs.
      if (kind === 'in' || kind === 'both') payload.req_check_in = fmtDT(at(day, time));
      if (kind === 'out' || kind === 'both') {
        const out = at(day, time);
        if (kind === 'both') out.setHours(out.getHours() + 8, out.getMinutes() + 30);
        payload.req_check_out = fmtDT(out);
      }
      await createReg(payload);
      setReason('');
      qc.invalidateQueries({ queryKey: ['regs-my'] });
      Alert.alert('Sent', 'Correction request sent to your manager.');
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Regularization" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => q.refetch()} />}>
        <Card style={styles.form}>
          <Text style={styles.h}>Missed a punch? Request a correction</Text>
          <Pressable style={styles.input} onPress={() => setShowDay(true)}>
            <Text style={styles.inputText}>{day.toDateString()}</Text>
            <Ionicons name="calendar-outline" size={16} color={colors.muted} />
          </Pressable>
          {showDay && (
            <DateTimePicker
              value={day} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowDay(false);
                if (d) setDay(d);
              }}
            />
          )}
          <View style={styles.kinds}>
            {(['in', 'out', 'both'] as const).map((k) => (
              <Pressable key={k} onPress={() => setKind(k)} style={[styles.kind, kind === k && styles.kindOn]}>
                <Text style={[styles.kindText, kind === k && styles.kindTextOn]}>
                  {k === 'in' ? 'Missed in' : k === 'out' ? 'Missed out' : 'Full day'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.input} onPress={() => setShowTime(true)}>
            <Text style={styles.inputText}>
              {String(time.getHours()).padStart(2, '0')}:{String(time.getMinutes()).padStart(2, '0')}
            </Text>
            <Ionicons name="time-outline" size={16} color={colors.muted} />
          </Pressable>
          {showTime && (
            <DateTimePicker
              value={time} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowTime(false);
                if (d) setTime(d);
              }}
            />
          )}
          <TextInput
            value={reason} onChangeText={setReason} multiline placeholder="e.g. biometric was down at gate B…"
            placeholderTextColor={colors.placeholder} style={styles.area}
          />
          <Pressable style={styles.submit} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Send request</Text>}
          </Pressable>
        </Card>

        {q.isLoading && <ActivityIndicator color={colors.navy} />}
        {q.error && (
          <Card>
            <Text style={styles.err}>{qError(q.error)}</Text>
          </Card>
        )}
        {(q.data ?? []).map((r) => (
          <Card key={r.id}>
            <View style={styles.top}>
              <View style={styles.mid}>
                <Text style={styles.date}>{r.date}</Text>
                <Text style={styles.times}>
                  In {r.req_check_in?.slice(11, 16) ?? '—'} → Out {r.req_check_out?.slice(11, 16) ?? '—'}
                </Text>
                {!!r.reason && <Text style={styles.reason}>{r.reason}</Text>}
              </View>
              <StatusPill status={r.status === 'pending' ? 'Pending' : r.status === 'approved' ? 'Approved' : 'Rejected'} />
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  form: { gap: 10 },
  h: { fontSize: 15, fontFamily: fonts.display, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48, justifyContent: 'center', paddingHorizontal: 14 },
  inputText: { fontSize: 14, fontFamily: fonts.body, color: colors.text },
  kinds: { flexDirection: 'row', gap: 8 },
  kind: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: '#FFF' },
  kindOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  kindText: { fontFamily: fonts.display, fontSize: 12, color: colors.muted },
  kindTextOn: { color: '#FFF' },
  area: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 80, padding: 12, fontSize: 14, fontFamily: fonts.body, color: colors.text, textAlignVertical: 'top', backgroundColor: '#FFF' },
  submit: { backgroundColor: colors.navy, borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
  top: { flexDirection: 'row', gap: 10 },
  mid: { flex: 1 },
  date: { fontSize: 14, fontFamily: fonts.display, color: colors.text, fontVariant: ['tabular-nums'] },
  times: { fontSize: 13, fontFamily: fonts.body, color: colors.text, marginTop: 3, fontVariant: ['tabular-nums'] },
  reason: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 3 },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
