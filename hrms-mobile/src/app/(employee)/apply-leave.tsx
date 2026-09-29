import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { getLeaveTypes } from '../../services/api';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppBar, Card, Screen } from '../../components/ui';
import { useApplyLeave } from '../../services/useHrms';
import {colors, radius, fonts} from '../../theme';

const fmt = (d: Date) => d.toISOString().slice(0, 10);
const pretty = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/** PAGE 9/11 — Apply Leave. Real date pickers + POST /leaves/. */
export default function ApplyLeave() {
  const apply = useApplyLeave();
  const typesQ = useQuery({ queryKey: ['leave-types'], queryFn: getLeaveTypes });
  const [leaveType, setLeaveType] = useState('casual');
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date());
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const types = (typesQ.data ?? []).map((t) => t.name);
  const typeNames = types.length ? types : ['casual', 'sick', 'earned', 'unpaid'];

  const days = useMemo(() => {
    const ms = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    return ms;
  }, [start, end]);

  const submit = () => {
    if (end < start) return setErr('End date cannot be before start date.');
    if (!reason.trim()) return setErr('Please enter a reason.');
    setErr(null);
    apply.mutate(
      { leave_type: leaveType, start_date: fmt(start), end_date: fmt(end), reason: reason.trim() },
      {
        onSuccess: () =>
          Alert.alert('Submitted', `Leave request for ${days} day${days === 1 ? '' : 's'} sent for approval.`, [
            { text: 'OK', onPress: () => router.back() },
          ]),
        onError: (e) => setErr(e instanceof Error ? e.message : 'Submission failed'),
      },
    );
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Apply Leave" />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>SELF SERVICE</Text>
        <Text style={styles.title}>New Request</Text>

        <Card style={styles.form}>
          <Text style={styles.label}>Leave Type *</Text>
          <Pressable style={styles.input} onPress={() => setOpen((v) => !v)}>
            <Text style={styles.inputText}>{leaveType}</Text>
            <Text style={styles.chev}>⌄</Text>
          </Pressable>
          {open &&
            typeNames.map((t) => (
              <Pressable
                key={t}
                style={styles.opt}
                onPress={() => {
                  setLeaveType(t);
                  setOpen(false);
                }}>
                <Text style={styles.optText}>{t}</Text>
              </Pressable>
            ))}

          <View style={styles.dates}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Start Date *</Text>
              <Pressable style={styles.input} onPress={() => setShowStart(true)}>
                <Text style={styles.inputText}>{pretty(start)}</Text>
                <Text>📅</Text>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>End Date *</Text>
              <Pressable style={styles.input} onPress={() => setShowEnd(true)}>
                <Text style={styles.inputText}>{pretty(end)}</Text>
                <Text>📅</Text>
              </Pressable>
            </View>
          </View>
          {(showStart || showEnd) && (
            <DateTimePicker
              value={showStart ? start : end}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') {
                  setShowStart(false);
                  setShowEnd(false);
                }
                if (!d) return;
                if (showStart) {
                  setStart(d);
                  if (end < d) setEnd(d);
                } else setEnd(d);
              }}
            />
          )}

          <View style={styles.dur}>
            <Text style={styles.durL}>📅  Calculated Duration</Text>
            <View style={styles.durPill}>
              <Text style={styles.durT}>
                {days} Day{days === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Reason *</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="Enter reason for leave request…"
            placeholderTextColor={colors.placeholder}
            style={styles.area}
          />

          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Pressable style={[styles.submit, apply.isPending && { opacity: 0.7 }]} onPress={submit} disabled={apply.isPending}>
            {apply.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitText}>Submit Application   ›</Text>
            )}
          </Pressable>
        </Card>
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 6 },
  eyebrow: { fontSize: 11, fontFamily: fonts.display, color: colors.placeholder, letterSpacing: 1.5 },
  title: { fontSize: 22, fontFamily: fonts.displayExtra, color: colors.text, marginBottom: 8 },
  form: { gap: 10 },
  label: { fontSize: 14, fontFamily: fonts.display, color: colors.text, marginTop: 4 },
  input: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, minHeight: 48, paddingHorizontal: 14 },
  inputText: { fontSize: 14, color: colors.text, textTransform: 'capitalize', fontFamily: fonts.body, },
  chev: { color: colors.muted, fontSize: 16, fontFamily: fonts.body, },
  opt: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  optText: { fontSize: 14, color: colors.text, textTransform: 'capitalize', fontFamily: fonts.body, },
  dates: { flexDirection: 'row', gap: 10 },
  dur: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.royalSoft, borderRadius: radius.lg, padding: 12 },
  durL: { fontSize: 13, color: colors.muted, fontFamily: fonts.semiBold },
  durPill: { backgroundColor: '#FFF', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  durT: { color: colors.navy, fontFamily: fonts.displayExtra },
  area: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, minHeight: 96, padding: 12, fontSize: 14, color: colors.text, textAlignVertical: 'top', fontFamily: fonts.body, },
  err: { color: colors.dangerDot, fontSize: 13, fontFamily: fonts.semiBold },
  submit: { backgroundColor: colors.royal, borderRadius: radius.lg, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitText: { color: '#FFF', fontFamily: fonts.displayExtra, fontSize: 15 },
});
