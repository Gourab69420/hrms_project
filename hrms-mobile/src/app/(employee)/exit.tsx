import DateTimePicker from '@react-native-community/datetimepicker';
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
import { useMyExit } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Resignation + full-and-final status. */
export default function Exit() {
  const { data, isLoading, refetch, submit } = useMyExit();
  const [resign, setResign] = useState(new Date());
  const [lwd, setLwd] = useState(new Date(Date.now() + 30 * 86400000));
  const [show, setShow] = useState<'r' | 'l' | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await submit.mutateAsync({
        resignation_date: resign.toISOString().slice(0, 10),
        last_working_date: lwd.toISOString().slice(0, 10),
        notes: notes.trim() || undefined,
      });
      Alert.alert('Submitted', 'HR has been notified of your resignation.');
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Exit" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        {isLoading && <ActivityIndicator color={colors.navy} style={{ marginTop: 16 }} />}
        {data ? (
          <Card>
            <View style={styles.top}>
              <View style={styles.mid}>
                <Text style={styles.h}>Resignation on file</Text>
                <Text style={styles.row}>
                  Resigned {data.resignation_date} → LWD {data.last_working_date}
                </Text>
                {data.fnf_amount != null && (
                  <Text style={styles.fnf}>FnF settlement: ₹{data.fnf_amount.toLocaleString('en-IN')}</Text>
                )}
                {!!data.notes && <Text style={styles.row}>{data.notes}</Text>}
              </View>
              <StatusPill status={data.status === 'pending' ? 'Pending' : data.status === 'approved' ? 'Approved' : 'Active'} />
            </View>
          </Card>
        ) : (
          !isLoading && (
            <Card style={styles.form}>
              <Text style={styles.h}>Submit resignation</Text>
              <Pressable style={styles.input} onPress={() => setShow('r')}>
                <Text style={styles.inputText}>Resignation {resign.toDateString()}</Text>
              </Pressable>
              <Pressable style={styles.input} onPress={() => setShow('l')}>
                <Text style={styles.inputText}>Last working day {lwd.toDateString()}</Text>
              </Pressable>
              {show && (
                <DateTimePicker
                  value={show === 'r' ? resign : lwd} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => {
                    if (Platform.OS !== 'ios') setShow(null);
                    if (d) (show === 'r' ? setResign : setLwd)(d);
                  }}
                />
              )}
              <TextInput
                value={notes} onChangeText={setNotes} multiline placeholder="Handover notes (optional)"
                placeholderTextColor={colors.placeholder} style={styles.area}
              />
              <Pressable style={styles.submit} onPress={send} disabled={busy}>
                {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Submit resignation</Text>}
              </Pressable>
            </Card>
          )
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  form: { gap: 10 },
  h: { fontSize: 15, fontFamily: fonts.display, color: colors.text },
  top: { flexDirection: 'row', gap: 10 },
  mid: { flex: 1 },
  row: { fontSize: 13, fontFamily: fonts.body, color: colors.text, marginTop: 4 },
  fnf: { fontSize: 14, fontFamily: fonts.display, color: colors.navy, marginTop: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48, justifyContent: 'center', paddingHorizontal: 14 },
  inputText: { fontSize: 14, fontFamily: fonts.body, color: colors.text },
  area: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 72, padding: 12, fontSize: 14, fontFamily: fonts.body, color: colors.text, textAlignVertical: 'top', backgroundColor: '#FFF' },
  submit: { backgroundColor: colors.dangerDot, borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
});
