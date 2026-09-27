import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Screen } from '../components/ui';
import { useAuth } from '../store/AuthContext';
import {colors, radius, fonts} from '../theme';

/**
 * App entry — user chooses Admin Login or Employee Login.
 * After real JWT login, role-based redirect; backend enforces RBAC.
 */
export default function Index() {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.navy} />
          <Text style={styles.sub}>Loading session…</Text>
        </View>
      </Screen>
    );
  }

  if (user && role === 'admin') return <Redirect href="/(admin)/dashboard" />;
  if (user && role === 'employee') return <Redirect href="/(employee)/home" />;

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.title}>HRMS Mobile</Text>
        <Text style={styles.sub}>Choose your login portal</Text>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Admin Login</Text>
          <Text style={styles.cardSub}>Full HR control — staff, attendance, leaves, payroll</Text>
          <Pressable style={styles.primary} onPress={() => router.push('/admin-login')}>
            <Text style={styles.primaryText}>Continue as Admin</Text>
          </Pressable>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Employee Login</Text>
          <Text style={styles.cardSub}>Your profile, attendance, leaves & payslips</Text>
          <Pressable style={styles.secondary} onPress={() => router.push('/employee-login')}>
            <Text style={styles.secondaryText}>Continue as Employee</Text>
          </Pressable>
        </Card>

        <Text style={styles.hint}>Master admin: gourabsamanta35@gmail.com</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontSize: 30, fontFamily: fonts.displayExtra, color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginBottom: 6, fontFamily: fonts.body, },
  card: { gap: 6 },
  cardTitle: { fontSize: 17, fontFamily: fonts.displayExtra, color: colors.text },
  cardSub: { fontSize: 13, color: colors.muted, marginBottom: 8, fontFamily: fonts.body, },
  primary: {
    backgroundColor: colors.navy, borderRadius: radius.md,
    minHeight: 48, alignItems: 'center', justifyContent: 'center',
  },
  primaryText: { color: '#FFF', fontFamily: fonts.displayExtra, fontSize: 15 },
  secondary: {
    backgroundColor: '#FFF', borderColor: colors.navy, borderWidth: 1.5,
    borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center',
  },
  secondaryText: { color: colors.navy, fontFamily: fonts.displayExtra, fontSize: 15 },
  hint: { textAlign: 'center', color: colors.placeholder, fontSize: 11, marginTop: 4, fontFamily: fonts.body, },
});
