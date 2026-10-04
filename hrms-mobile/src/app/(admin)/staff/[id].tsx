import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {AppBar, Avatar, Card, Screen, StatusPill, initialsOf, toneFor} from '../../../components/ui';
import { api, downloadDocUrl, getMyDocs, type Doc } from '../../../services/api';
import { useAuth } from '../../../store/AuthContext';
import { useEmployee } from '../../../services/useHrms';
import {colors, radius, fonts} from '../../../theme';
import { useEffect, useState } from 'react';

/** Staff detail — live employee + counts. Call / Email buttons use device linking. */
export default function StaffDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { backendRole } = useAuth();
  const empId = Number(id);
  const { data: e, isLoading, error, refetch } = useEmployee(empId);
  const [counts, setCounts] = useState<{ att: number; leaves: number } | null>(null);

  // Show saved edits the moment we return from the edit screen.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  useEffect(() => {
    if (!Number.isFinite(empId)) return;
    (async () => {
      try {
        const [a, l] = await Promise.all([
          api.get(`/attendance/employee/${empId}`),
          api.get('/leaves/'),
        ]);
        setCounts({ att: (a.data as unknown[]).length, leaves: (l.data as { employee_id: number }[]).filter((x) => x.employee_id === empId).length });
      } catch {
        /* non-fatal */
      }
    })();
  }, [empId]);

  if (isLoading)
    return (
      <Screen>
        <AppBar title="Staff" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      </Screen>
    );
  if (error || !e)
    return (
      <Screen>
        <AppBar title="Staff" />
        <View style={styles.center}>
          <Text style={styles.err}>{error ?? 'Employee not found'}</Text>
          <Pressable style={styles.btn} onPress={() => router.back()}>
            <Text style={styles.btnText}>Go back</Text>
          </Pressable>
        </View>
      </Screen>
    );

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title={e.code} />
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Card style={styles.head}>
          <Avatar initials={initialsOf(`${e.first_name} ${e.last_name}`)} tone={0} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {e.first_name} {e.last_name}
            </Text>
            <Text style={styles.pos}>{e.position || '—'}</Text>
            <StatusPill status={e.status} />
          </View>
        </Card>

        <Card>
          <Row label="Email" value={e.email} />
          <Row label="Phone" value={e.phone || '—'} />
          <Row label="Department" value={e.department} />
          <Row label="Date of joining" value={e.hire_date || '—'} />
          {counts && (
            <>
              <Row label="Attendance records" value={String(counts.att)} />
              <Row label="Leave applications" value={String(counts.leaves)} />
            </>
          )}
        </Card>

        <View style={styles.btns}>
          {!!e.phone && (
            <Pressable style={styles.btn} onPress={() => Linking.openURL(`tel:${e.phone}`)}>
              <Ionicons name="call-outline" size={18} color="#FFF" />
              <Text style={styles.btnText}>Call</Text>
            </Pressable>
          )}
          <Pressable style={[styles.btn, styles.btnOutline]} onPress={() => Linking.openURL(`mailto:${e.email}`)}>
            <Ionicons name="mail-outline" size={18} color={colors.navy} />
            <Text style={[styles.btnText, { color: colors.navy }]}>Email</Text>
          </Pressable>
        </View>

        <View style={styles.btns}>
          <Pressable
            style={[styles.btn, styles.btnOutline]}
            onPress={() => router.push(`/(admin)/staff/edit/${e.id}` as never)}>
            <Ionicons name="create-outline" size={18} color={colors.navy} />
            <Text style={[styles.btnText, { color: colors.navy }]}>Edit details</Text>
          </Pressable>
        </View>

        <DocumentsSection empId={e.id} />

        {backendRole === 'admin' && (
        <>
        <Pressable
          style={styles.danger}
          onPress={() =>
            Alert.alert('Deactivate', `Deactivate ${e.first_name}? They lose access.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Deactivate',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await api.patch(`/employees/${e.id}`, { is_active: false });
                    Alert.alert('Done', 'Employee deactivated.', [{ text: 'OK', onPress: () => router.back() }]);
                  } catch (err) {
                    Alert.alert('Failed', err instanceof Error ? err.message : 'Try again');
                  }
                },
              },
            ])
          }>
          <Text style={styles.dangerText}>Deactivate employee</Text>
        </Pressable>
        <Pressable
          style={styles.wipe}
          onPress={() =>
            Alert.alert(
              'Delete permanently?',
              `${e.first_name} ${e.last_name} and ALL their data (login, attendance, leaves, payroll, documents…) will be removed forever.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete all',
                  style: 'destructive',
                  onPress: () =>
                    Alert.alert('Final confirmation', 'This cannot be undone. Delete everything?', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete forever',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const { deleteEmployeeFull } = await import('../../../services/api');
                            const res = await deleteEmployeeFull(e.id);
                            const total = Object.values(res.removed).reduce((s, n) => s + n, 0);
                            Alert.alert('Deleted', `${res.deleted} removed with ${total} related record(s).`, [
                              { text: 'OK', onPress: () => router.back() },
                            ]);
                          } catch (err) {
                            Alert.alert('Failed', err instanceof Error ? err.message : 'Try again');
                          }
                        },
                      },
                    ]),
                },
              ],
            )
          }>
          <Text style={styles.wipeText}>Delete employee + all data</Text>
        </Pressable>
        </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.lbl}>{label}</Text>
      <Text style={styles.val}>{value}</Text>
    </View>
  );
}

function DocumentsSection({ empId }: { empId: number }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docType, setDocType] = useState('offer_letter');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setDocs(await getMyDocs(empId));
    } catch {
      /* non-fatal */
    }
  };
  useEffect(() => {
    load();
  }, [empId]);

  const upload = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', {
        uri: asset.uri,
        name: asset.name ?? 'document.pdf',
        type: asset.mimeType ?? 'application/pdf',
      } as never);
      await api.post(`/documents/employee/${empId}?doc_type=${encodeURIComponent(docType)}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const open = async (d: Doc) => {
    try {
      const target = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${d.file_name}`;
      const dl = await FileSystem.downloadAsync(downloadDocUrl(d.id), target, {
        headers: { Authorization: `Bearer ${await currentToken()}` },
      });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dl.uri);
      else Alert.alert('Saved', dl.uri);
    } catch (e) {
      Alert.alert('Download failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  return (
    <Card>
      <Text style={styles.docTitle}>Documents</Text>
      {docs.map((d) => (
        <Pressable key={d.id} style={styles.docRow} onPress={() => open(d)}>
          <Text style={styles.docName}>
            📄 {d.file_name} <Text style={styles.docMeta}>({d.doc_type})</Text>
          </Text>
        </Pressable>
      ))}
      {docs.length === 0 && <Text style={styles.docMeta}>No documents yet.</Text>}
      <View style={styles.docTypes}>
        {['offer_letter', 'id_proof', 'contract', 'other'].map((t) => (
          <Pressable key={t} onPress={() => setDocType(t)} style={[styles.chip, docType === t && styles.chipOn]}>
            <Text style={[styles.chipText, docType === t && styles.chipTextOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.upload} onPress={upload} disabled={busy}>
        <Text style={styles.uploadText}>{busy ? 'Uploading…' : '⤒ Upload document'}</Text>
      </Pressable>
    </Card>
  );
}

async function currentToken(): Promise<string> {
  const { loadToken } = await import('../../../services/api');
  return (await loadToken()) ?? '';
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  err: { color: colors.dangerDot, fontFamily: fonts.body, },
  body: { paddingHorizontal: 16, gap: 12, paddingBottom: 24 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  name: { fontSize: 18, fontFamily: fonts.displayExtra, color: colors.text },
  pos: { fontSize: 13, color: colors.muted, marginVertical: 3, fontFamily: fonts.body, },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  lbl: { fontSize: 12, color: colors.muted, fontFamily: fonts.body, },
  val: { fontSize: 13, fontFamily: fonts.display, color: colors.text, maxWidth: '60%', textAlign: 'right' },
  btns: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1, flexDirection: 'row', backgroundColor: colors.navy, borderRadius: radius.md,
    minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnOutline: { backgroundColor: '#FFF', borderWidth: 1.5, borderColor: colors.navy },
  btnText: { color: '#FFF', fontFamily: fonts.displayExtra },
  danger: { alignItems: 'center', padding: 12 },
  dangerText: { color: colors.dangerDot, fontFamily: fonts.display },
  wipe: { backgroundColor: colors.dangerDot, borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  wipeText: { color: '#FFF', fontFamily: fonts.displayExtra, fontSize: 14 },
  docTitle: { fontSize: 15, fontFamily: fonts.display, color: colors.text, marginBottom: 8 },
  docRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  docName: { fontSize: 13, fontFamily: fonts.body, color: colors.text },
  docMeta: { fontSize: 12, fontFamily: fonts.body, color: colors.muted },
  docTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#FFF' },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  chipTextOn: { color: '#FFF' },
  upload: { backgroundColor: colors.royalSoft, borderRadius: radius.md, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  uploadText: { color: colors.navy, fontFamily: fonts.display, fontSize: 13 },
});
