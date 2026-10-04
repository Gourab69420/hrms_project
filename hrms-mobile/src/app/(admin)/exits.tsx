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
import { AppBar, Avatar, Card, Screen, initialsOf, toneFor, StatusPill } from '../../components/ui';
import { getAllExits, reviewExit } from '../../services/api';
import { useEmployees } from '../../services/useHrms';
import { useAuth } from '../../store/AuthContext';
import { qError } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Admin exit reviews — approve/complete with FnF amount. Completing deactivates the employee. */
export default function Exits() {
  const qc = useQueryClient();
  const { backendRole } = useAuth();
  const q = useQuery({ queryKey: ['exits-all'], queryFn: getAllExits });
  const { data: emps } = useEmployees();
  const [fnf, setFnf] = useState<Record<number, string>>({});
  const nameOf = (id: number) => {
    const e = emps.find((x) => x.id === id);
    return e ? `${e.first_name} ${e.last_name}` : `EMP-${String(id).padStart(4, '0')}`;
  };

  const review = (id: number, status: string) => {
    const amount = fnf[id]?.trim() === '' ? undefined : Number(fnf[id]);
    if (amount !== undefined && Number.isNaN(amount)) {
      Alert.alert('Invalid amount', 'Enter a valid FnF amount or leave it blank.');
      return;
    }
    Alert.alert('Update exit', `Set status to ${status}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: status === 'completed' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            await reviewExit(id, { status, fnf_amount: amount });
            qc.invalidateQueries({ queryKey: ['exits-all'] });
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
        <AppBar title="Exits & FnF" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => q.refetch()} />}>
        {q.isLoading && <ActivityIndicator color={colors.navy} style={{ marginTop: 16 }} />}
        {q.error && (
          <Card>
            <Text style={styles.err}>{qError(q.error)}</Text>
          </Card>
        )}
        {(q.data ?? []).map((x) => (
          <Card key={x.id} style={styles.card}>
            <View style={styles.top}>
              <Avatar initials={initialsOf(nameOf(x.employee_id))} tone={toneFor(x.employee_id)} />
              <View style={styles.mid}>
                <Text style={styles.name}>{nameOf(x.employee_id)}</Text>
                <Text style={styles.dates}>
                  Resigned {x.resignation_date} → LWD {x.last_working_date}
                </Text>
                {!!x.notes && <Text style={styles.notes}>{x.notes}</Text>}
                {x.fnf_amount != null && <Text style={styles.fnf}>FnF: ₹{x.fnf_amount.toLocaleString('en-IN')}</Text>}
              </View>
              <StatusPill status={x.status === 'pending' ? 'Pending' : x.status === 'approved' ? 'Approved' : 'Active'} />
            </View>
            {x.status !== 'completed' && (
              <View style={styles.row}>
                <TextInput
                  value={fnf[x.id] ?? ''}
                  onChangeText={(v) => setFnf((s) => ({ ...s, [x.id]: v }))}
                  keyboardType="numeric"
                  placeholder="FnF ₹"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
                {x.status === 'pending' && (
                  <Pressable style={styles.btn} onPress={() => review(x.id, 'approved')}>
                    <Text style={styles.btnText}>Approve</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.btn, styles.complete]} onPress={() => review(x.id, 'completed')}>
                  <Text style={[styles.btnText, { color: '#FFF' }]}>
                    {backendRole === 'admin' ? 'Complete' : 'Complete (admin)'}
                  </Text>
                </Pressable>
              </View>
            )}
          </Card>
        ))}
        {!q.isLoading && (q.data ?? []).length === 0 && (
          <Card>
            <Text style={styles.muted}>No resignations on file.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  card: { gap: 10 },
  top: { flexDirection: 'row', gap: 10 },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  dates: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  notes: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 3 },
  fnf: { fontSize: 13, fontFamily: fonts.display, color: colors.navy, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 44, paddingHorizontal: 12, fontSize: 14, fontFamily: fonts.body, color: colors.text, backgroundColor: '#FFF' },
  btn: { backgroundColor: colors.royalSoft, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 11 },
  complete: { backgroundColor: colors.navy },
  btnText: { color: colors.navy, fontFamily: fonts.display, fontSize: 13 },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
