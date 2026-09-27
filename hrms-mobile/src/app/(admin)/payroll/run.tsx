import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppBar, Card, Screen } from '../../../components/ui';
import { useCreatePayroll, useEmployees } from '../../../services/useHrms';
import {colors, radius, fonts} from '../../../theme';

/** Run Payroll — POST /payroll/ (net auto-computed backend-side). */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function RunPayroll() {
  const { data: emps } = useEmployees();
  const create = useCreatePayroll();
  const now = new Date();
  const [empId, setEmpId] = useState<number | null>(null);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [basic, setBasic] = useState('');
  const [bonus, setBonus] = useState('');
  const [ded, setDed] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const num = (v: string) => (v.trim() === '' ? 0 : Number(v));
  const net = num(basic) + num(bonus) - num(ded);

  const submit = async () => {
    if (!empId) return setErr('Select an employee.');
    if (!basic.trim() || Number.isNaN(num(basic))) return setErr('Enter a valid basic salary.');
    setBusy(true);
    setErr(null);
    try {
      await create.mutateAsync({
        employee_id: empId,
        month,
        year,
        basic_salary: num(basic),
        bonuses: num(bonus),
        deductions: num(ded),
      });
      Alert.alert('Processed', `Payroll created. Net ${net.toLocaleString('en-IN')}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to run payroll');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Run Payroll" />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card style={styles.form}>
          <Text style={styles.label}>Employee *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chips}>
              {emps.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => setEmpId(empId === e.id ? null : e.id)}
                  style={[styles.chip, empId === e.id && styles.chipOn]}>
                  <Text style={[styles.chipText, empId === e.id && styles.chipTextOn]}>
                    {e.first_name} {e.last_name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          {emps.length === 0 && <Text style={styles.muted}>No employees yet.</Text>}

          <Text style={styles.label}>Month *</Text>
          <View style={styles.months}>
            {MONTHS.map((m, i) => (
              <Pressable key={m} onPress={() => setMonth(i + 1)} style={[styles.m, month === i + 1 && styles.mOn]}>
                <Text style={[styles.mText, month === i + 1 && styles.mTextOn]}>{m.slice(0, 3)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Year *</Text>
          <View style={styles.months}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <Pressable key={y} onPress={() => setYear(y)} style={[styles.m, year === y && styles.mOn]}>
                <Text style={[styles.mText, year === y && styles.mTextOn]}>{y}</Text>
              </Pressable>
            ))}
          </View>

          <Field label="Basic salary *">
            <TextInput value={basic} onChangeText={setBasic} keyboardType="numeric" style={styles.input} placeholder="35000" placeholderTextColor={colors.placeholder} />
          </Field>
          <Field label="Bonuses / allowances">
            <TextInput value={bonus} onChangeText={setBonus} keyboardType="numeric" style={styles.input} placeholder="0" placeholderTextColor={colors.placeholder} />
          </Field>
          <Field label="Deductions">
            <TextInput value={ded} onChangeText={setDed} keyboardType="numeric" style={styles.input} placeholder="0" placeholderTextColor={colors.placeholder} />
          </Field>

          <View style={styles.net}>
            <Text style={styles.netLabel}>Net (backend computes)</Text>
            <Text style={styles.netVal}>₹{net.toLocaleString('en-IN')}</Text>
          </View>
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Pressable style={[styles.submit, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Process payroll</Text>}
          </Pressable>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 24 },
  form: { gap: 10 },
  label: { fontSize: 13, fontFamily: fonts.display, color: colors.text, marginTop: 4, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    minHeight: 48, paddingHorizontal: 14, fontSize: 15, color: colors.text, backgroundColor: '#FFF', fontFamily: fonts.body, },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#FFF' },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.display, fontSize: 13, color: colors.muted },
  chipTextOn: { color: '#FFF', fontFamily: fonts.body, },
  muted: { color: colors.muted, fontSize: 13, fontFamily: fonts.body, },
  months: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  m: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF' },
  mOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  mText: { fontFamily: fonts.display, fontSize: 12, color: colors.muted },
  mTextOn: { color: '#FFF', fontFamily: fonts.body, },
  net: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.royalSoft, borderRadius: 10, padding: 12 },
  netLabel: { color: colors.muted, fontSize: 12, fontFamily: fonts.body, },
  netVal: { color: colors.navy, fontFamily: fonts.displayExtra, fontSize: 16 },
  err: { color: colors.dangerDot, fontSize: 13, fontFamily: fonts.semiBold },
  submit: { backgroundColor: colors.navy, borderRadius: radius.md, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  submitText: { color: '#FFF', fontFamily: fonts.displayExtra, fontSize: 15 },
});
