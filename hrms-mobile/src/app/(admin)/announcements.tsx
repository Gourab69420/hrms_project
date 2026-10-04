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
import { AppBar, Card, Screen } from '../../components/ui';
import {
  api,
  createAnnouncement,
  createPoll,
  deleteAnnouncement,
  getAnnouncements,
  getPolls,
} from '../../services/api';
import { qError } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Admin comms — post announcements, run polls, close them. */
export default function Announcements() {
  const qc = useQueryClient();
  const annQ = useQuery({ queryKey: ['announcements'], queryFn: getAnnouncements });
  const pollQ = useQuery({ queryKey: ['polls'], queryFn: getPolls });
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [question, setQuestion] = useState('');
  const [opts, setOpts] = useState('');
  const [busy, setBusy] = useState(false);

  const post = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Missing fields', 'Title and body are required.');
      return;
    }
    setBusy(true);
    try {
      await createAnnouncement({ title: title.trim(), body: body.trim() });
      setTitle('');
      setBody('');
      qc.invalidateQueries({ queryKey: ['announcements'] });
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const postPoll = async () => {
    const options = opts.split('\n').map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || options.length < 2) {
      Alert.alert('Missing fields', 'Question + at least 2 options (one per line).');
      return;
    }
    setBusy(true);
    try {
      await createPoll({ question: question.trim(), options });
      setQuestion('');
      setOpts('');
      qc.invalidateQueries({ queryKey: ['polls'] });
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const close = async (id: number) => {
    try {
      await api.patch(`/polls/${id}/close`);
      qc.invalidateQueries({ queryKey: ['polls'] });
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Announcements" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              annQ.refetch();
              pollQ.refetch();
            }}
          />
        }>
        <Card style={styles.form}>
          <Text style={styles.h}>New announcement</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={colors.placeholder} style={styles.input} />
          <TextInput
            value={body} onChangeText={setBody} multiline placeholder="Message for everyone…" placeholderTextColor={colors.placeholder} style={styles.area}
          />
          <Pressable style={styles.add} onPress={post} disabled={busy}>
            <Text style={styles.addText}>Post announcement</Text>
          </Pressable>
        </Card>

        {(annQ.data ?? []).map((a) => (
          <Card key={a.id} style={styles.row}>
            <View style={styles.mid}>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.msg}>{a.body}</Text>
              <Text style={styles.date}>{a.created_at.slice(0, 10)}</Text>
            </View>
            <Pressable
              onPress={() =>
                Alert.alert('Delete?', a.title, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await deleteAnnouncement(a.id);
                      qc.invalidateQueries({ queryKey: ['announcements'] });
                    },
                  },
                ])
              }>
              <Text style={styles.del}>Delete</Text>
            </Pressable>
          </Card>
        ))}

        <Card style={styles.form}>
          <Text style={styles.h}>New poll</Text>
          <TextInput value={question} onChangeText={setQuestion} placeholder="Question" placeholderTextColor={colors.placeholder} style={styles.input} />
          <TextInput
            value={opts} onChangeText={setOpts} multiline placeholder={'Option 1\nOption 2\nOption 3'} placeholderTextColor={colors.placeholder} style={styles.area}
          />
          <Pressable style={styles.add} onPress={postPoll} disabled={busy}>
            <Text style={styles.addText}>Start poll</Text>
          </Pressable>
        </Card>

        {(pollQ.data ?? []).map((p) => (
          <Card key={p.id}>
            <Text style={styles.title}>{p.question}</Text>
            {p.options.map((o) => (
              <Text key={o.id} style={styles.opt}>
                {o.text} — {o.votes} vote{o.votes === 1 ? '' : 's'}
              </Text>
            ))}
            {p.active ? (
              <Pressable style={styles.close} onPress={() => close(p.id)}>
                <Text style={styles.closeText}>Close poll</Text>
              </Pressable>
            ) : (
              <View style={styles.closedRow}>
                <Text style={styles.closed}>Closed</Text>
                <Pressable
                  onPress={() =>
                    Alert.alert('Delete poll?', p.question, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const { deletePoll } = await import('../../services/api');
                            await deletePoll(p.id);
                            qc.invalidateQueries({ queryKey: ['polls'] });
                          } catch (e) {
                            Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
                          }
                        },
                      },
                    ])
                  }>
                  <Text style={styles.delPoll}>Delete</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ))}
        {annQ.isLoading && <ActivityIndicator color={colors.navy} />}
        {annQ.error && (
          <Card>
            <Text style={styles.err}>{qError(annQ.error)}</Text>
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
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48, paddingHorizontal: 14, fontSize: 14, fontFamily: fonts.body, color: colors.text, backgroundColor: '#FFF' },
  area: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 80, padding: 12, fontSize: 14, fontFamily: fonts.body, color: colors.text, textAlignVertical: 'top', backgroundColor: '#FFF' },
  add: { backgroundColor: colors.navy, borderRadius: radius.md, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  mid: { flex: 1 },
  title: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  msg: { fontSize: 13, fontFamily: fonts.body, color: colors.text, marginTop: 4 },
  date: { fontSize: 11, fontFamily: fonts.body, color: colors.muted, marginTop: 4 },
  del: { color: colors.dangerDot, fontFamily: fonts.display, fontSize: 13 },
  opt: { fontSize: 13, fontFamily: fonts.body, color: colors.text, marginTop: 4 },
  close: { marginTop: 8, alignSelf: 'flex-end', backgroundColor: colors.royalSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  closeText: { color: colors.navy, fontFamily: fonts.display, fontSize: 12 },
  closedRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  delPoll: { color: colors.dangerDot, fontFamily: fonts.display, fontSize: 12 },
  closed: { marginTop: 8, fontSize: 12, fontFamily: fonts.body, color: colors.muted },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
