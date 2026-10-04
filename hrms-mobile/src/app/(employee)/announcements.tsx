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
import { usePolls } from '../../services/useHrms';
import { useAnnouncements } from '../../services/useHrms';
import { colors, fonts } from '../../theme';

/** Company announcements + polls (vote once, change allowed). */
export default function Announcements() {
  const ann = useAnnouncements();
  const polls = usePolls();
  const [voting, setVoting] = useState<number | null>(null);

  const vote = async (pollId: number, optionId: number) => {
    setVoting(pollId);
    try {
      await polls.vote.mutateAsync({ pollId, optionId });
    } catch (e) {
      Alert.alert('Vote failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setVoting(null);
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
              ann.refetch();
              polls.refetch();
            }}
          />
        }>
        {(ann.isLoading || polls.isLoading) && <ActivityIndicator color={colors.navy} style={{ marginTop: 16 }} />}
        {ann.data.map((a) => (
          <Card key={`a${a.id}`}>
            <Text style={styles.title}>{a.title}</Text>
            <Text style={styles.msg}>{a.body}</Text>
            <Text style={styles.date}>{a.created_at.slice(0, 10)}</Text>
          </Card>
        ))}
        {polls.data.map((p) => (
          <Card key={`p${p.id}`}>
            <Text style={styles.title}>{p.question}</Text>
            {p.options.map((o) => {
              const total = p.options.reduce((s, x) => s + x.votes, 0);
              const pct = total ? Math.round((o.votes / total) * 100) : 0;
              const mine = p.my_vote === o.id;
              return (
                <Pressable
                  key={o.id}
                  style={[styles.opt, mine && styles.optMine]}
                  disabled={!p.active || voting === p.id}
                  onPress={() => vote(p.id, o.id)}>
                  <Text style={styles.optText}>
                    {mine ? '✓ ' : ''}{o.text}
                  </Text>
                  <Text style={styles.votes}>
                    {o.votes} • {pct}%
                  </Text>
                </Pressable>
              );
            })}
            {!p.active && <Text style={styles.closed}>Poll closed</Text>}
          </Card>
        ))}
        {!ann.isLoading && ann.data.length === 0 && polls.data.length === 0 && (
          <Card>
            <Text style={styles.muted}>No announcements yet.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  title: { fontSize: 15, fontFamily: fonts.display, color: colors.text },
  msg: { fontSize: 13, fontFamily: fonts.body, color: colors.text, marginTop: 6 },
  date: { fontSize: 11, fontFamily: fonts.body, color: colors.muted, marginTop: 6 },
  opt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, marginTop: 8 },
  optMine: { borderColor: colors.navy, backgroundColor: colors.royalSoft },
  optText: { fontSize: 13, fontFamily: fonts.body, color: colors.text, flex: 1 },
  votes: { fontSize: 12, fontFamily: fonts.display, color: colors.navy },
  closed: { marginTop: 8, fontSize: 12, fontFamily: fonts.body, color: colors.muted },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
});
