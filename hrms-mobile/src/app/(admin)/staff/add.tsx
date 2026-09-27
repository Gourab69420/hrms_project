import { router } from 'expo-router';
import { useState } from 'react';
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
import { AppBar, Card, Screen } from '../../../components/ui';
import { api } from '../../../services/api';
import { useCreateEmployee, useDepartments } from '../../../services/useHrms';
import {colors, radius, fonts} from '../../../theme';

/** Add Staff — creates Employee (POST /employees/) + optional login (POST /auth/register). */
export default function AddStaff() {
  const { data: depts } = useDepartments();
  const create = useCreateEmployee();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [deptId, setDeptId] = useState<number | null>(null);
  const [makeLogin, setMakeLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!first.trim() || !last.trim() || !email.trim()) {
      setErr('First name, last name and email are required.');
      return;
    }
    if (makeLogin && (!username.trim() || !password)) {
      setErr('Username and password are required for the login account.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const emp: { id: number } = await create.mutateAsync({
        first_name: first.trim(),
        last_name: last.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        position: position.trim() || undefined,
        department_id: deptId,
      });
      if (makeLogin) {
        await api.post('/auth/register', {
          username: username.trim(),
          password,
          role: 'employee',
          employee_id: emp.id,
        });
      }
      Alert.alert('Created', `${first} ${last} added${makeLogin ? ' with login access' : ''}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create employee');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Add Staff" />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card style={styles.form}>
          <Field label="First name *">
            <TextInput value={first} onChangeText={setFirst} style={styles.input} placeholder="Gourab" placeholderTextColor={colors.placeholder} />
          </Field>
          <Field label="Last name *">
            <TextInput value={last} onChangeText={setLast} style={styles.input} placeholder="Samanta" placeholderTextColor={colors.placeholder} />
          </Field>
          <Field label="Work email *">
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholder="name@company.com"
              placeholderTextColor={colors.placeholder}
            />
          </Field>
          <Field label="Phone">
            <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} placeholder="+91 …" placeholderTextColor={colors.placeholder} />
          </Field>
          <Field label="Position">
            <TextInput value={position} onChangeText={setPosition} style={styles.input} placeholder="Software Engineer" placeholderTextColor={colors.placeholder} />
          </Field>
          <Text style={styles.label}>Department</Text>
          <View style={styles.depts}>
            {depts.map((d) => (
              <Pressable key={d.id} onPress={() => setDeptId(deptId === d.id ? null : d.id)} style={[styles.chip, deptId === d.id && styles.chipOn]}>
                <Text style={[styles.chipText, deptId === d.id && styles.chipTextOn]}>{d.name}</Text>
              </Pressable>
            ))}
            {depts.length === 0 && <Text style={styles.muted}>No departments yet.</Text>}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Create login account (employee portal)</Text>
            <Switch value={makeLogin} onValueChange={setMakeLogin} />
          </View>
          {makeLogin && (
            <>
              <Field label="Username *">
                <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" style={styles.input} placeholder="username or email" placeholderTextColor={colors.placeholder} />
              </Field>
              <Field label="Password *">
                <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="••••••••" placeholderTextColor={colors.placeholder} />
              </Field>
            </>
          )}
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Pressable style={[styles.submit, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Create employee</Text>}
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
  depts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#FFF' },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.display, fontSize: 13, color: colors.muted },
  chipTextOn: { color: '#FFF', fontFamily: fonts.body, },
  muted: { color: colors.muted, fontSize: 13, fontFamily: fonts.body, },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  err: { color: colors.dangerDot, fontSize: 13, fontFamily: fonts.semiBold },
  submit: { backgroundColor: colors.navy, borderRadius: radius.md, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  submitText: { color: '#FFF', fontFamily: fonts.displayExtra, fontSize: 15 },
});
