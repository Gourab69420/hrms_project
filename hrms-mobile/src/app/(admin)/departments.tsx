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
import { createDepartment, deleteDepartment, getDepartments } from '../../services/api';
import { qError } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/** Departments — every department shows its unique ID; create + delete (blocked while staff assigned). */
export default function Departments() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['departments'], queryFn: getDepartments });
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter the department name.');
      return;
    }
    setBusy(true);
    try {
      await createDepartment({ name: name.trim(), description: desc.trim() || undefined });
      setName('');
      setDesc('');
      qc.invalidateQueries({ queryKey: ['departments'] });
      qc.invalidateQueries({ queryKey: ['employees'] });
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: number, label: string) => {
    Alert.alert('Delete department', `Delete ${label} (DEPT-${id})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDepartment(id);
            qc.invalidateQueries({ queryKey: ['departments'] });
            qc.invalidateQueries({ queryKey: ['employees'] });
          } catch (e) {
            Alert.alert('Blocked', e instanceof Error ? e.message : 'Try again');
          }
        },
      },
    ]);
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Departments" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => q.refetch()} />}>
        <Card style={styles.form}>
          <Text style={styles.h}>New department (ID auto-assigned)</Text>
          <TextInput
            value={name} onChangeText={setName} placeholder="Engineering" placeholderTextColor={colors.placeholder} style={styles.input}
          />
          <TextInput
            value={desc} onChangeText={setDesc} placeholder="Description (optional)" placeholderTextColor={colors.placeholder} style={styles.input}
          />
          <Pressable style={styles.add} onPress={add} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addText}>+ Create department</Text>}
          </Pressable>
        </Card>

        {q.isLoading && <ActivityIndicator color={colors.navy} style={{ marginTop: 8 }} />}
        {q.error && (
          <Card>
            <Text style={styles.err}>{qError(q.error)}</Text>
          </Card>
        )}
        {(q.data ?? []).map((d) => (
          <Card key={d.id} style={styles.row}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>DEPT-{d.id}</Text>
            </View>
            <View style={styles.mid}>
              <Text style={styles.name}>{d.name}</Text>
              {!!d.description && <Text style={styles.desc}>{d.description}</Text>}
            </View>
            <Pressable onPress={() => remove(d.id, d.name)}>
              <Text style={styles.del}>Delete</Text>
            </Pressable>
          </Card>
        ))}
        {!q.isLoading && (q.data ?? []).length === 0 && (
          <Card>
            <Text style={styles.muted}>No departments yet — create the first one above.</Text>
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
  add: { backgroundColor: colors.navy, borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  badgeText: { color: '#FFF', fontFamily: fonts.display, fontSize: 11, fontVariant: ['tabular-nums'] },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  desc: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  del: { color: colors.dangerDot, fontFamily: fonts.display, fontSize: 13 },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
