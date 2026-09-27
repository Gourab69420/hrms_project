import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Card, Screen } from '../components/ui';
import { useAuth, type Role } from '../store/AuthContext';
import {colors, radius, fonts} from '../theme';
import { Redirect, router } from 'expo-router';

/**
 * Shared login form. Backend verifies everything:
 * POST /auth/login -> JWT, GET /auth/me -> role, app routes by that role.
 * The portal choice is UX labeling only — never a gate.
 */
export function LoginForm({ portal, title, subtitle }: { portal: Role; title: string; subtitle: string }) {
  const { user, role, signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (user && role) {
    return <Redirect href={role === 'admin' ? '/(admin)/dashboard' : '/(employee)/home'} />;
  }

  const submit = async () => {
    if (!username.trim() || !password) {
      setErr('Enter email/username and password.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const actual = await signIn(username, password);
      router.replace(actual === 'admin' ? '/(admin)/dashboard' : '/(employee)/home');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={styles.wrap}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
        <Card style={styles.form}>
          <Text style={styles.label}>Email / Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@company.com"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            onSubmitEditing={submit}
          />
          {err ? <Text style={styles.err}>{err}</Text> : null}
          <Pressable style={[styles.btn, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>Login</Text>
            )}
          </Pressable>
        </Card>
        <Text style={styles.hint}>Verified by backend (JWT). You land in the portal matching your account role.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: 8 },
  back: { color: colors.royal, fontFamily: fonts.display, fontSize: 14, marginBottom: 4 },
  title: { fontSize: 28, fontFamily: fonts.displayExtra, color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginBottom: 8, fontFamily: fonts.body, },
  form: { gap: 8 },
  label: { fontSize: 13, fontFamily: fonts.display, color: colors.text, marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    minHeight: 48, paddingHorizontal: 14, fontSize: 15, color: colors.text,
    backgroundColor: '#FFF', fontFamily: fonts.body, },
  err: { color: colors.dangerDot, fontSize: 13, fontFamily: fonts.semiBold },
  btn: {
    backgroundColor: colors.navy, borderRadius: radius.md,
    minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  btnText: { color: '#FFF', fontFamily: fonts.displayExtra, fontSize: 15 },
  hint: { textAlign: 'center', color: colors.placeholder, fontSize: 11, marginTop: 6, fontFamily: fonts.body, },
});
