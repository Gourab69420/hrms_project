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
import { AppBar, Card, Screen } from '../../components/ui';
import { createHoliday, deleteHoliday, getHolidays } from '../../services/api';
import { qError } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Admin holiday calendar — add (date picker) / remove. Blocks leave math via balances view. */
export default function Holidays() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['holidays'], queryFn: getHolidays });
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter the holiday name.');
      return;
    }
    setBusy(true);
    try {
      await createHoliday({ date: date.toISOString().slice(0, 10), name: name.trim() });
      setName('');
      qc.invalidateQueries({ queryKey: ['holidays'] });
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: number, label: string) => {
    Alert.alert('Delete holiday', `Remove ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHoliday(id);
            qc.invalidateQueries({ queryKey: ['holidays'] });
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
          }
        },
      },
    ]);
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Holidays" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => q.refetch()} />}>
        <Card style={styles.form}>
          <Pressable style={styles.input} onPress={() => setShow(true)}>
            <Text style={styles.inputText}>📅  {date.toDateString()}</Text>
          </Pressable>
          {show && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShow(false);
                if (d) setDate(d);
              }}
            />
          )}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Diwali, Christmas…"
            placeholderTextColor={colors.placeholder}
            style={styles.input2}
          />
          <Pressable style={styles.add} onPress={add} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addText}>+ Add holiday</Text>}
          </Pressable>
        </Card>

        {q.isLoading && <ActivityIndicator color={colors.navy} />}
        {q.error && (
          <Card>
            <Text style={styles.err}>{qError(q.error)}</Text>
          </Card>
        )}
        {(q.data ?? []).map((h) => (
          <Card key={h.id} style={styles.row}>
            <View style={styles.mid}>
              <Text style={styles.name}>{h.name}</Text>
              <Text style={styles.date}>{h.date}</Text>
            </View>
            <Pressable onPress={() => remove(h.id, h.name)}>
              <Text style={styles.del}>Delete</Text>
            </Pressable>
          </Card>
        ))}
        {!q.isLoading && (q.data ?? []).length === 0 && (
          <Card>
            <Text style={styles.muted}>No holidays yet.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  form: { gap: 10 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48, justifyContent: 'center', paddingHorizontal: 14 },
  inputText: { fontSize: 14, fontFamily: fonts.body, color: colors.text },
  input2: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48, paddingHorizontal: 14, fontSize: 14, fontFamily: fonts.body, color: colors.text, backgroundColor: '#FFF' },
  add: { backgroundColor: colors.navy, borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  date: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2, fontVariant: ['tabular-nums'] },
  del: { color: colors.dangerDot, fontFamily: fonts.display, fontSize: 13 },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
