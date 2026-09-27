import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppBar, Card, Screen } from '../../components/ui';
import { usePayroll } from '../../services/useHrms';
import {colors, fonts} from '../../theme';

/** PAGE 10/11 — My Payroll. Download generates a real PDF payslip on-device. */
export default function EmpPayroll() {
  const { data, isLoading, error, refetch } = usePayroll();
  const [pdfBusy, setPdfBusy] = useState(false);
  const c = data?.current;

  const download = async () => {
    if (!c?.raw) return;
    setPdfBusy(true);
    try {
      const r = c.raw;
      const html = `
        <html><body style="font-family:sans-serif;padding:32px;color:#0F172A">
          <h1>Payslip — ${c.month}</h1>
          <p>Payroll ID: ${c.payrollId} • Status: ${c.status}</p>
          <hr/>
          <p>Basic Salary: ${c.basic}</p>
          <p>Allowances / Bonuses: ${c.allowances}</p>
          <p>Gross: ${c.gross}</p>
          <p>Deductions: ${c.deductions}</p>
          <hr/>
          <h2>Net Pay: ${c.net}</h2>
          <p>Basic ${r.basic_salary} + Bonuses ${r.bonuses} − Deductions ${r.deductions} = Net ${r.net_salary}</p>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      else Alert.alert('Saved', uri);
    } catch (e) {
      Alert.alert('PDF failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar
          title="Payroll"
          right={<Ionicons name="notifications-outline" size={22} color={colors.text} />}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        {isLoading && <ActivityIndicator color={colors.navy} style={{ marginVertical: 24 }} />}
        {error && (
          <Card>
            <Text style={styles.err}>{error}</Text>
          </Card>
        )}
        {!isLoading && !error && !c && (
          <Card>
            <Text style={styles.muted}>No payroll released yet. Check back after the payroll run.</Text>
          </Card>
        )}
        {c && (
          <>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <Text style={styles.eyebrow}>NET TAKE-HOME PAY</Text>
                <View style={styles.proc}>
                  <Text style={styles.procText}>● {c.status}</Text>
                </View>
              </View>
              <Text style={styles.net}>{c.net}</Text>
              <Text style={styles.meta}>
                Payroll ID: {c.payrollId} • {c.cycle}
              </Text>
              <Pressable style={styles.dl} onPress={download} disabled={pdfBusy}>
                {pdfBusy ? (
                  <ActivityIndicator color={colors.navy} />
                ) : (
                  <Text style={styles.dlText}>⤓   Download Payslip PDF</Text>
                )}
              </Pressable>
            </View>

            <Card>
              <Text style={styles.breakTitle}>Compensation Breakdown</Text>
              <Row l="Basic Salary" r={c.basic} />
              <Row l="Allowances" r={c.allowances} />
              <Row l="Gross" r={c.gross} />
              <Row l="Deductions" r={`-${c.deductions}`} />
              <View style={styles.formula}>
                <Text style={styles.formulaText}>
                  {c.basic} + {c.allowances} − {c.deductions} = {c.net}
                </Text>
              </View>
            </Card>

            {data!.history.length > 0 && <Text style={styles.pastTitle}>Past Payslips</Text>}
            {data!.history.map((h) => (
              <Card key={h.id} style={styles.past}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pastM}>{h.month}</Text>
                  <Text style={styles.pastS}>
                    {h.amount} • {h.disbursed}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </Screen>
  );
}

function Row({ l, r }: { l: string; r: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.l}>{l}</Text>
      <Text style={rowStyles.r}>{r}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  l: { fontSize: 14, color: colors.muted, fontFamily: fonts.body, },
  r: { fontSize: 14, fontFamily: fonts.displayExtra, color: colors.text, fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  hero: { backgroundColor: colors.navy, borderRadius: 16, padding: 16, gap: 8 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#B6C4FF', fontSize: 11, fontFamily: fonts.display, letterSpacing: 1 },
  proc: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  procText: { color: '#FFF', fontSize: 12, fontFamily: fonts.semiBold },
  net: { color: '#FFF', fontSize: 36, fontFamily: fonts.displayExtra, fontVariant: ['tabular-nums'] },
  meta: { color: '#D3E4FE', fontSize: 12, fontFamily: fonts.body, },
  dl: { backgroundColor: '#FFF', borderRadius: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  dlText: { color: colors.navy, fontFamily: fonts.displayExtra, fontSize: 14 },
  breakTitle: { fontSize: 15, fontFamily: fonts.displayExtra, color: colors.text, marginBottom: 6 },
  formula: { backgroundColor: colors.royalSoft, borderRadius: 10, padding: 10, marginTop: 10 },
  formulaText: { fontSize: 13, fontFamily: fonts.display, color: colors.navy, textAlign: 'center' },
  pastTitle: { fontSize: 17, fontFamily: fonts.displayExtra, color: colors.text, marginTop: 4 },
  past: { flexDirection: 'row', alignItems: 'center' },
  pastM: { fontSize: 14, fontFamily: fonts.displayExtra, color: colors.text },
  pastS: { fontSize: 12, color: colors.muted, marginTop: 2, fontFamily: fonts.body, },
  muted: { color: colors.muted, textAlign: 'center', fontFamily: fonts.body, },
  err: { color: colors.dangerDot, fontFamily: fonts.body, },
});
