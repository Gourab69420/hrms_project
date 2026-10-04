import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {AppBar, Avatar, Card, Screen, SearchBar, StatusPill, initialsOf, toneFor} from '../../components/ui';
import { useDepartments, useEmployees } from '../../services/useHrms';
import {colors, radius, shadow, fonts} from '../../theme';

/**
 * PAGE 2/11 — Staff Directory (live).
 * Search hits backend (?search=). Rows open detail. Add Staff opens the create form.
 */
export default function Staff() {
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('All Staff');
  const { data, isLoading, error, refetch } = useEmployees(query);
  const { data: depts } = useDepartments();

  // Edits/deletes land instantly when navigating back to this list.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const chips = useMemo(() => ['All Staff', ...depts.map((d) => d.name)], [depts]);
  const filtered = useMemo(
    () => (dept === 'All Staff' ? data : data.filter((e) => e.department === dept)),
    [data, dept],
  );


  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Employees" />
      </View>

      <FlatList
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        data={filtered}
        keyExtractor={(e) => String(e.id)}
        onRefresh={refetch}
        refreshing={isLoading}
        ListHeaderComponent={
          <>
            <Card style={styles.summary}>
              <View>
                <Text style={styles.summaryNum}>{data.length} Employees</Text>
                <Text style={styles.summarySub}>company roster</Text>
              </View>
              <Pressable style={styles.addBtn} onPress={() => router.push('/(admin)/staff/add')}>
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={styles.addText}>Add Staff</Text>
              </Pressable>
            </Card>

            <View style={{ marginTop: 12 }}>
              <SearchBar value={query} onChange={setQuery} />
            </View>

            <View style={styles.chips}>
              {chips.map((d) => {
                const active = dept === d;
                return (
                  <Pressable key={d} onPress={() => setDept(d)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{d}</Text>
                  </Pressable>
                );
              })}
            </View>

            {isLoading && <ActivityIndicator color={colors.navy} style={{ marginVertical: 16 }} />}
            {error && (
              <Card>
                <Text style={styles.err}>{error}</Text>
                <Pressable style={styles.retry} onPress={() => refetch()}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </Card>
            )}
          </>
        }
        renderItem={({ item: e, index }) => (
          <Pressable onPress={() => router.push(`/(admin)/staff/${e.id}` as never)}>
            <Card style={styles.row}>
              <View>
                <Avatar initials={initialsOf(`${e.first_name} ${e.last_name}`)} tone={toneFor(e.id)} />
                <View
                  style={[styles.presence, { backgroundColor: e.status === 'Active' ? '#10B981' : '#F59E0B' }]}
                />
              </View>
              <View style={styles.rowMid}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>
                    {e.first_name} {e.last_name}
                  </Text>
                  <StatusPill status={e.status} />
                </View>
                <Text style={styles.pos}>{e.position || '—'}</Text>
                <Text style={styles.dept}>{e.department}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading && !error ? (
            <Card>
              <Text style={styles.empty}>No staff found{query ? ` for "${query}"` : ''}.</Text>
            </Card>
          ) : null
        }
        ListFooterComponent={
          <Text style={styles.showing}>Showing {filtered.length} team member{filtered.length === 1 ? '' : 's'}</Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 4, gap: 10, paddingBottom: 24 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryNum: { fontSize: 22, fontFamily: fonts.displayExtra, color: colors.text },
  summarySub: { fontSize: 13, color: colors.muted, marginTop: 4, fontFamily: fonts.body, },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.navy, borderRadius: radius.sm,
    paddingHorizontal: 16, minHeight: 44,
  },
  addText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
  chips: { flexDirection: 'row', gap: 8, marginVertical: 12, flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#FFF', borderColor: colors.border, borderWidth: 1,
    borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, ...shadow.card,
  },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 13, fontFamily: fonts.display, color: colors.muted },
  chipTextActive: { color: '#FFF', fontFamily: fonts.body, },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  presence: {
    position: 'absolute', right: 2, bottom: 2, width: 12, height: 12,
    borderRadius: 6, borderWidth: 2, borderColor: '#FFF',
  },
  rowMid: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 15, fontFamily: fonts.display, color: colors.text },
  pos: { fontSize: 13, color: colors.muted, marginTop: 2, fontFamily: fonts.body, },
  dept: { fontSize: 13, color: colors.royal, fontFamily: fonts.semiBold, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.muted, fontSize: 14, fontFamily: fonts.body, },
  err: { color: colors.dangerDot, fontSize: 13, marginBottom: 8, fontFamily: fonts.body, },
  retry: { backgroundColor: colors.navy, borderRadius: 8, padding: 10, alignItems: 'center' },
  retryText: { color: '#FFF', fontFamily: fonts.display },
  showing: { textAlign: 'center', color: colors.placeholder, fontSize: 12, marginTop: 8, fontFamily: fonts.body, },
});
