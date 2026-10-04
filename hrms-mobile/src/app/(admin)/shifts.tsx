import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppBar, Card, Screen } from '../../components/ui';
import { createShift, deleteShift, getShifts } from '../../services/api';
import { qError } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Shift masters. Shift delete is blocked while assigned. Quotas live under Holidays (admin-only). */
export default function Shifts() {
  const qc = useQueryClient();
  const shQ = useQuery({ queryKey: ['shifts'], queryFn: getShifts });
  const [name, setName] = useState('Evening');
  const [start, setStart] = useState('13:00');
  const [end, setEnd] = useState('21:30');
  const [late, setLate] = useState('13:30');
  const [busy, setBusy] = useState(false);

  const addShift = async () => {
    if (!name.trim()) return Alert.alert('Missing', 'Shift name required.');
    setBusy(true);
    try {
      await createShift({ name: name.trim(), start_time: start, end_time: end, late_after: late });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Shifts" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              shQ.refetch();
            }}
          />
        }>
        <Text style={styles.h}>Shifts (late rule follows the employee's shift)</Text>
        {(shQ.data ?? []).map((s) => (
          <Card key={s.id} style={styles.row}>
            <View style={styles.mid}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.meta}>
                {s.start_time}–{s.end_time} • late after {s.late_after}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                Alert.alert('Delete shift?', s.name, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteShift(s.id);
                        qc.invalidateQueries({ queryKey: ['shifts'] });
                      } catch (e) {
                        Alert.alert('Blocked', e instanceof Error ? e.message : 'Try again');
                      }
                    },
                  },
                ])
              }>
              <Text style={styles.del}>Delete</Text>
            </Pressable>
          </Card>
        ))}
        <Card style={styles.form}>
          <View style={styles.grid}>
            {(
              [
                ['Name', name, setName, 'default'],
                ['Start HH:MM', start, setStart, 'default'],
                ['End HH:MM', end, setEnd, 'default'],
                ['Late after', late, setLate, 'default'],
              ] as const
            ).map(([l, v, s]) => (
              <View key={l} style={styles.cell}>
                <Text style={styles.cl}>{l}</Text>
                <TextInput value={v} onChangeText={s} style={styles.input} placeholderTextColor={colors.placeholder} />
              </View>
            ))}
          </View>
          <Pressable style={styles.add} onPress={addShift} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addText}>Add shift</Text>}
          </Pressable>
        </Card>
        {shQ.error && (
          <Card>
            <Text style={styles.err}>{qError(shQ.error)}</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  h: { fontSize: 15, fontFamily: fonts.display, color: colors.text, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text, textTransform: 'capitalize' },
  meta: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2, fontVariant: ['tabular-nums'] },
  del: { color: colors.dangerDot, fontFamily: fonts.display, fontSize: 13 },
  form: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flex: 1, minWidth: '45%' },
  cl: { fontSize: 11, fontFamily: fonts.body, color: colors.muted, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 46, paddingHorizontal: 12, fontSize: 14, fontFamily: fonts.body, color: colors.text, backgroundColor: '#FFF' },
  add: { backgroundColor: colors.navy, borderRadius: radius.md, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#FFF', fontFamily: fonts.display, fontSize: 13 },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
