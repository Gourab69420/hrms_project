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
import {
  createLoan,
  getEmployeeLoans,
  getStructures,
  setStructure,
} from '../../services/api';
import { useEmployees } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Loans & salary structure per employee. Salary split auto-feeds payroll runs. */
export default function Comp() {
  const qc = useQueryClient();
  const { data: emps } = useEmployees();
  const [empId, setEmpId] = useState<number | null>(null);
  const loansQ = useQuery({
    queryKey: ['emp-loans', empId],
    queryFn: () => getEmployeeLoans(empId!),
    enabled: !!empId,
  });
  const structQ = useQuery({
    queryKey: ['emp-struct', empId],
    queryFn: () => getStructures(empId!),
    enabled: !!empId,
  });

  const [principal, setPrincipal] = useState('');
  const [emi, setEmi] = useState('');
  const [basic, setBasic] = useState('');
  const [hra, setHra] = useState('');
  const [conv, setConv] = useState('');
  const [special, setSpecial] = useState('');
  const [eff, setEff] = useState(new Date());
  const [showEff, setShowEff] = useState(false);
  const [busy, setBusy] = useState(false);

  const addLoan = async () => {
    if (!empId || !principal || !emi) {
      Alert.alert('Missing fields', 'Select employee + principal + monthly installment.');
      return;
    }
    setBusy(true);
    try {
      await createLoan({ employee_id: empId, principal: Number(principal), monthly_installment: Number(emi) });
      setPrincipal('');
      setEmi('');
      qc.invalidateQueries({ queryKey: ['emp-loans', empId] });
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const saveStruct = async () => {
    if (!empId || !basic) {
      Alert.alert('Missing fields', 'Select employee + basic salary.');
      return;
    }
    setBusy(true);
    try {
      await setStructure({
        employee_id: empId,
        basic: Number(basic),
        hra: Number(hra || 0),
        conveyance: Number(conv || 0),
        special_allowance: Number(special || 0),
        effective_from: eff.toISOString().slice(0, 10),
      });
      qc.invalidateQueries({ queryKey: ['emp-struct', empId] });
      Alert.alert('Saved', 'Salary structure updated. Future payroll runs use this split.');
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const cur = (structQ.data ?? [])[0];

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Loans & Salary" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              loansQ.refetch();
              structQ.refetch();
            }}
          />
        }>
        <Text style={styles.label}>Employee *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chips}>
            {emps.map((e) => (
              <Pressable key={e.id} onPress={() => setEmpId(empId === e.id ? null : e.id)} style={[styles.chip, empId === e.id && styles.chipOn]}>
                <Text style={[styles.chipText, empId === e.id && styles.chipTextOn]}>
                  {e.first_name} {e.last_name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {empId && (
          <>
            <Card>
              <Text style={styles.h}>
                Salary split{cur ? ` (active since ${cur.effective_from})` : ' — none set'}
              </Text>
              <View style={styles.grid}>
                {(
                  [
                    ['Basic *', basic, setBasic],
                    ['HRA', hra, setHra],
                    ['Conveyance', conv, setConv],
                    ['Special', special, setSpecial],
                  ] as const
                ).map(([l, v, s]) => (
                  <View key={l} style={styles.cell}>
                    <Text style={styles.cl}>{l}</Text>
                    <TextInput value={v} onChangeText={s} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.placeholder} style={styles.input} />
                  </View>
                ))}
              </View>
              <Pressable style={styles.input} onPress={() => setShowEff(true)}>
                <Text style={styles.inputText}>Effective {eff.toDateString()}</Text>
              </Pressable>
              {showEff && (
                <DateTimePicker
                  value={eff} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => {
                    if (Platform.OS !== 'ios') setShowEff(false);
                    if (d) setEff(d);
                  }}
                />
              )}
              <Pressable style={styles.add} onPress={saveStruct} disabled={busy}>
                {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addText}>Save structure</Text>}
              </Pressable>
            </Card>

            <Card>
              <Text style={styles.h}>New loan / advance</Text>
              <View style={styles.grid}>
                <View style={styles.cell}>
                  <Text style={styles.cl}>Principal</Text>
                  <TextInput value={principal} onChangeText={setPrincipal} keyboardType="numeric" placeholder="50000" placeholderTextColor={colors.placeholder} style={styles.input} />
                </View>
                <View style={styles.cell}>
                  <Text style={styles.cl}>Monthly EMI</Text>
                  <TextInput value={emi} onChangeText={setEmi} keyboardType="numeric" placeholder="5000" placeholderTextColor={colors.placeholder} style={styles.input} />
                </View>
              </View>
              <Pressable style={styles.add} onPress={addLoan} disabled={busy}>
                <Text style={styles.addText}>Issue loan (auto-deducts in payroll)</Text>
              </Pressable>
              {(loansQ.data ?? []).map((l) => (
                <Text key={l.id} style={styles.loan}>
                  ₹{l.principal.toLocaleString('en-IN')} • EMI ₹{l.monthly_installment.toLocaleString('en-IN')} • left ₹
                  {l.remaining.toLocaleString('en-IN')} • {l.status}
                </Text>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  label: { fontSize: 13, fontFamily: fonts.display, color: colors.text },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#FFF' },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.display, fontSize: 13, color: colors.muted },
  chipTextOn: { color: '#FFF' },
  h: { fontSize: 15, fontFamily: fonts.display, color: colors.text, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flex: 1, minWidth: '45%' },
  cl: { fontSize: 11, fontFamily: fonts.body, color: colors.muted, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 46, paddingHorizontal: 12, fontSize: 14, fontFamily: fonts.body, color: colors.text, backgroundColor: '#FFF', justifyContent: 'center' },
  inputText: { fontSize: 14, fontFamily: fonts.body, color: colors.text },
  add: { backgroundColor: colors.navy, borderRadius: radius.md, minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  addText: { color: '#FFF', fontFamily: fonts.display, fontSize: 13 },
  loan: { fontSize: 12, fontFamily: fonts.body, color: colors.text, marginTop: 6, fontVariant: ['tabular-nums'] },
});
