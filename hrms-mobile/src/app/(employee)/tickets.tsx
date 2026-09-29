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
import { AppBar, Card, Screen, StatusPill } from '../../components/ui';
import { useMyTickets } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Helpdesk — payslip corrections, letter requests, etc. */
const CATS = ['payslip', 'letter', 'leave', 'attendance', 'other'];

export default function Tickets() {
  const { data, isLoading, error, refetch, open } = useMyTickets();
  const [cat, setCat] = useState('payslip');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!subject.trim()) {
      Alert.alert('Missing subject', 'Summarize your request in one line.');
      return;
    }
    setBusy(true);
    try {
      await open.mutateAsync({ category: cat, subject: subject.trim(), body: body.trim() || undefined });
      setSubject('');
      setBody('');
      Alert.alert('Raised', 'HR has been notified.');
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Helpdesk" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        <Card style={styles.form}>
          <Text style={styles.h}>Raise a request</Text>
          <View style={styles.cats}>
            {CATS.map((c) => (
              <Pressable key={c} onPress={() => setCat(c)} style={[styles.cat, cat === c && styles.catOn]}>
                <Text style={[styles.catText, cat === c && styles.catTextOn]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor={colors.placeholder} style={styles.input} />
          <TextInput
            value={body} onChangeText={setBody} multiline placeholder="Details (optional)" placeholderTextColor={colors.placeholder} style={styles.area}
          />
          <Pressable style={styles.submit} onPress={submit} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitText}>Submit ticket</Text>}
          </Pressable>
        </Card>

        {isLoading && <ActivityIndicator color={colors.navy} />}
        {error && (
          <Card>
            <Text style={styles.err}>{error}</Text>
          </Card>
        )}
        {data.map((t) => (
          <Card key={t.id}>
            <View style={styles.top}>
              <View style={styles.mid}>
                <Text style={styles.subject}>{t.subject}</Text>
                <Text style={styles.meta}>
                  {t.category} • {t.created_at.slice(0, 10)}
                </Text>
                {!!t.body && <Text style={styles.msg}>{t.body}</Text>}
              </View>
              <StatusPill status={t.status === 'open' ? 'Pending' : t.status === 'closed' ? 'Approved' : 'On Leave'} />
            </View>
          </Card>
        ))}
        {!isLoading && data.length === 0 && (
          <Card>
            <Text style={styles.muted}>No tickets yet.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  form: { gap: 10 },
  h: { fontSize: 15, fontFamily: fonts.display, color: colors.text },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FFF' },
  catOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  catText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textTransform: 'capitalize' },
  catTextOn: { color: '#FFF' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48, paddingHorizontal: 14, fontSize: 14, fontFamily: fonts.body, color: colors.text, backgroundColor: '#FFF' },
  area: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 72, padding: 12, fontSize: 14, fontFamily: fonts.body, color: colors.text, textAlignVertical: 'top', backgroundColor: '#FFF' },
  submit: { backgroundColor: colors.navy, borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
  top: { flexDirection: 'row', gap: 10 },
  mid: { flex: 1 },
  subject: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  meta: { fontSize: 11, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  msg: { fontSize: 13, fontFamily: fonts.body, color: colors.text, marginTop: 5 },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
