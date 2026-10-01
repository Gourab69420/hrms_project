import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppBar, Card, Screen } from '../../../../components/ui';
import { getDepartments, getShifts, updateEmployee, type Department, type Shift } from '../../../../services/api';
import { useEmployee, useEmployees } from '../../../../services/useHrms';
import { colors, fonts, radius } from '../../../../theme';

/** Edit staff — department, manager, shift, contact, position, active. Saves straight to the database. */
export default function EditStaff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const empId = Number(id);
  const { data: e, isLoading } = useEmployee(empId);
  const { data: all } = useEmployees();
  const [depts, setDepts] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [deptId, setDeptId] = useState<number | null>(null);
  const [mgrId, setMgrId] = useState<number | null>(null);
  const [shiftId, setShiftId] = useState<number | null>(null);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mgrTouched = useRef(false);
  const shiftTouched = useRef(false);

  const pickMgr = (v: number | null) => {
    mgrTouched.current = true;
    setMgrId(v);
  };
  const pickShift = (v: number | null) => {
    shiftTouched.current = true;
    setShiftId(v);
  };

  useEffect(() => {
    getDepartments().then(setDepts).catch(() => {});
    getShifts().then(setShifts).catch(() => {});
  }, []);

  useEffect(() => {
    if (e && !ready) {
      setFirst(e.first_name);
      setLast(e.last_name);
      setPhone(e.phone);
      setPosition(e.position);
      setDeptId(e.department_id);
      setShiftId(null);
      setActive(e.status === 'Active');
      setReady(true);
    }
  }, [e, ready]);

  useEffect(() => {
    if (e && ready) {
      // manager_id / shift_id come from the raw employee record
      import('../../../../services/api').then(async (m) => {
        try {
          const raw = await m.api.get(`/employees/${empId}`);
          setMgrId((v) => (mgrTouched.current ? v : (raw.data.manager_id ?? null)));
          setShiftId((v) => (shiftTouched.current ? v : (raw.data.shift_id ?? null)));
        } catch {
          /* ignore */
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e, ready, empId]);

  const submit = async () => {
    if (!first.trim() || !last.trim()) {
      setErr('First and last name are required.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await updateEmployee(empId, {
        first_name: first.trim(),
        last_name: last.trim(),
        phone: phone.trim() || null,
        position: position.trim() || null,
        department_id: deptId,
        manager_id: mgrId,
        shift_id: shiftId,
        is_active: active,
      });
      Alert.alert('Saved', 'Employee details updated in the database.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !ready) {
    return (
      <Screen>
        <AppBar title="Edit Staff" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title={`Edit ${e?.code ?? ''}`} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card style={styles.form}>
          <View style={styles.two}>
            <View style={styles.cell}>
              <Text style={styles.label}>First name *</Text>
              <TextInput value={first} onChangeText={setFirst} style={styles.input} />
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>Last name *</Text>
              <TextInput value={last} onChangeText={setLast} style={styles.input} />
            </View>
          </View>
          <Text style={styles.label}>Phone</Text>
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
          <Text style={styles.label}>Position</Text>
          <TextInput value={position} onChangeText={setPosition} style={styles.input} />

          <Text style={styles.label}>Department</Text>
          <View style={styles.chips}>
            <Pressable onPress={() => setDeptId(null)} style={[styles.chip, deptId === null && styles.chipOn]}>
              <Text style={[styles.chipText, deptId === null && styles.chipTextOn]}>None</Text>
            </Pressable>
            {depts.map((d) => (
              <Pressable key={d.id} onPress={() => setDeptId(deptId === d.id ? null : d.id)} style={[styles.chip, deptId === d.id && styles.chipOn]}>
                <Text style={[styles.chipText, deptId === d.id && styles.chipTextOn]}>
                  {d.name} (DEPT-{d.id})
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Manager</Text>
          <View style={styles.chips}>
            <Pressable onPress={() => pickMgr(null)} style={[styles.chip, mgrId === null && styles.chipOn]}>
              <Text style={[styles.chipText, mgrId === null && styles.chipTextOn]}>None</Text>
            </Pressable>
            {all
              .filter((x) => x.id !== empId)
              .map((x) => (
                <Pressable key={x.id} onPress={() => pickMgr(mgrId === x.id ? null : x.id)} style={[styles.chip, mgrId === x.id && styles.chipOn]}>
                  <Text style={[styles.chipText, mgrId === x.id && styles.chipTextOn]}>
                    {x.first_name} {x.last_name}
                  </Text>
                </Pressable>
              ))}
          </View>

          <Text style={styles.label}>Shift</Text>
          <View style={styles.chips}>
            <Pressable onPress={() => pickShift(null)} style={[styles.chip, shiftId === null && styles.chipOn]}>
              <Text style={[styles.chipText, shiftId === null && styles.chipTextOn]}>Default</Text>
            </Pressable>
            {shifts.map((s) => (
              <Pressable key={s.id} onPress={() => pickShift(shiftId === s.id ? null : s.id)} style={[styles.chip, shiftId === s.id && styles.chipOn]}>
                <Text style={[styles.chipText, shiftId === s.id && styles.chipTextOn]}>
                  {s.name} ({s.start_time}–{s.end_time})
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Active employee</Text>
            <Switch value={active} onValueChange={setActive} />
          </View>

          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Pressable style={[styles.submit, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Save changes</Text>}
          </Pressable>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 24 },
  form: { gap: 10 },
  two: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1 },
  label: { fontSize: 13, fontFamily: fonts.display, color: colors.text, marginTop: 4, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48, paddingHorizontal: 14, fontSize: 15, fontFamily: fonts.body, color: colors.text, backgroundColor: '#FFF' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF' },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  chipTextOn: { color: '#FFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  err: { color: colors.dangerDot, fontSize: 13, fontFamily: fonts.body },
  submit: { backgroundColor: colors.navy, borderRadius: radius.md, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  submitText: { color: '#FFF', fontFamily: fonts.displayExtra, fontSize: 15 },
});
