import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppBar, Card, Screen } from '../../components/ui';
import { API_URL, api, createHoliday, deleteHoliday, loadToken, syncHolidays } from '../../services/api';
import { qError, useHolidays } from '../../services/useHrms';
import { colors, fonts, radius } from '../../theme';

/**
 * Admin Holidays — Google Sheet (AppSheet) is the source of truth.
 * Sheet rows show an "official sheet" badge; Sync imports them locally for offline fallback.
 * Yearly Paid Quota lives here (admin-only, never in Shifts/employee UI).
 */
export default function Holidays() {
  const qc = useQueryClient();
  const { data, status, isLoading, error, refetch } = useHolidays();
  const ltQ = useQuery({
    queryKey: ['leave-types'],
    queryFn: () => import('../../services/api').then((m) => m.getLeaveTypes()),
  });
  const [date, setDate] = useState(new Date());
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const add = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Enter the holiday name.');
      return;
    }
    setBusy(true);
    try {
      await createHoliday({ date: date.toISOString().slice(0, 10), name: name.trim() });
      setName('');
      qc.invalidateQueries({ queryKey: ['holidays'] });
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await syncHolidays();
      qc.invalidateQueries({ queryKey: ['holidays'] });
      Alert.alert('Synced', `Imported ${r.added}, updated ${r.updated} from the official sheet.`);
    } catch (e) {
      Alert.alert('Sync failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSyncing(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const target = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}holidays_template.csv`;
      const dl = await FileSystem.downloadAsync(`${API_URL}/holidays/template`, target, {
        headers: { Authorization: `Bearer ${(await loadToken()) ?? ''}` },
      });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dl.uri);
      else Alert.alert('Saved', dl.uri);
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const uploadCsv = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    Alert.alert(
      'Replace holidays?',
      'Uploading replaces the ENTIRE holiday set with this file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: async () => {
            setUploading(true);
            try {
              const form = new FormData();
              form.append('file', {
                uri: asset.uri,
                name: asset.name ?? 'holidays.csv',
                type: asset.mimeType ?? 'text/csv',
              } as never);
              const res = await api.post('/holidays/upload', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              qc.invalidateQueries({ queryKey: ['holidays'] });
              Alert.alert('Replaced', `Holiday set replaced with ${res.data.replaced_with} entries.`);
            } catch (e) {
              Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again');
            } finally {
              setUploading(false);
            }
          },
        },
      ],
    );
  };

  const remove = (id: number, label: string) => {
    Alert.alert('Delete holiday', `Remove ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHoliday(id);
            qc.invalidateQueries({ queryKey: ['holidays'] });
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Try again');
          }
        },
      },
    ]);
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Holidays" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        <Card style={styles.src}>
          <View style={styles.srcMid}>
            <Text style={styles.srcTitle}>
              {status?.configured ? 'Official Google Sheet connected' : 'Sheet not connected'}
            </Text>
            <Text style={styles.srcSub}>
              {status?.configured
                ? 'Holiday list below comes straight from the sheet.'
                : 'Set APPSHEET_APP_ID + APPSHEET_APP_KEY on the backend — showing local entries for now.'}
            </Text>
          </View>
          {status?.configured && (
            <Pressable style={styles.sync} onPress={sync} disabled={syncing}>
              <View style={styles.btnRow}>
                <Ionicons name="sync-outline" size={14} color="#FFF" />
                <Text style={styles.syncText}>{syncing ? '…' : 'Sync'}</Text>
              </View>
            </Pressable>
          )}
        </Card>

        <Card style={styles.form}>
          <Text style={styles.h}>Set holidays from file (replaces the whole set)</Text>
          <View style={styles.csvRow}>
            <Pressable style={styles.csvBtn} onPress={downloadTemplate}>
              <View style={styles.btnRow}>
                <Ionicons name="download-outline" size={14} color={colors.navy} />
                <Text style={styles.csvText}>Template</Text>
              </View>
            </Pressable>
            <Pressable style={[styles.csvBtn, styles.csvPrimary]} onPress={uploadCsv} disabled={uploading}>
              <View style={styles.btnRow}>
                <Ionicons name="cloud-upload-outline" size={14} color="#FFF" />
                <Text style={[styles.csvText, { color: '#FFF' }]}>
                  {uploading ? 'Uploading…' : 'Upload CSV'}
                </Text>
              </View>
            </Pressable>
          </View>
          <Text style={styles.csvHint}>Columns: Date (YYYY-MM-DD), Name, Reason, Type, Year</Text>
        </Card>

        <Card style={styles.form}>
          <Text style={styles.h}>Custom local holiday</Text>
          <Pressable style={styles.input} onPress={() => setShow(true)}>
            <Text style={styles.inputText}>{date.toDateString()}</Text>
          </Pressable>
          {show && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShow(false);
                if (d) setDate(d);
              }}
            />
          )}
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Diwali, Christmas…"
            placeholderTextColor={colors.placeholder}
            style={styles.input2}
          />
          <Pressable style={styles.add} onPress={add} disabled={busy}>
            {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addText}>+ Add holiday</Text>}
          </Pressable>
        </Card>

        {isLoading && <ActivityIndicator color={colors.navy} />}
        {error && (
          <Card>
            <Text style={styles.err}>{error}</Text>
          </Card>
        )}
        {data.map((h) => (
          <Card key={`${h.source}-${h.id}-${h.date}`} style={styles.row}>
            <View style={styles.mid}>
              <Text style={styles.name}>{h.name}</Text>
              <Text style={styles.date}>{h.date}</Text>
              {!!h.description && <Text style={styles.desc}>{h.description}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={[styles.badge, h.source === 'appsheet' && styles.badgeSheet]}>
                <Text style={[styles.badgeText, h.source === 'appsheet' && styles.badgeTextSheet]}>
                  {h.source === 'appsheet' ? 'official sheet' : 'local'}
                </Text>
              </View>
              {h.id > 0 && (
                <Pressable onPress={() => remove(h.id, h.name)}>
                  <Text style={styles.del}>Delete</Text>
                </Pressable>
              )}
            </View>
          </Card>
        ))}
        {!isLoading && data.length === 0 && (
          <Card>
            <Text style={styles.muted}>No holidays yet.</Text>
          </Card>
        )}

        <Text style={styles.h}>Yearly Paid Quota (admin only)</Text>
        {(ltQ.data ?? []).map((t) => (
          <Card key={t.id} style={styles.row}>
            <View style={styles.mid}>
              <Text style={styles.name}>{t.name}</Text>
              <Text style={styles.date}>
                {t.yearly_quota}/yr • {t.paid ? 'paid' : 'unpaid'}
              </Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  src: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  srcMid: { flex: 1 },
  srcTitle: { fontSize: 13, fontFamily: fonts.display, color: colors.text },
  srcSub: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 3 },
  sync: { backgroundColor: colors.navy, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10 },
  syncText: { color: '#FFF', fontFamily: fonts.display, fontSize: 13 },
  form: { gap: 10 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  csvRow: { flexDirection: 'row', gap: 10 },
  csvBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.navy, borderRadius: radius.md,
    minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF',
  },
  csvPrimary: { backgroundColor: colors.navy },
  csvText: { color: colors.navy, fontFamily: fonts.display, fontSize: 13 },
  csvHint: { fontSize: 11, fontFamily: fonts.body, color: colors.muted },
  h: { fontSize: 15, fontFamily: fonts.display, color: colors.text, marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48, justifyContent: 'center', paddingHorizontal: 14 },
  inputText: { fontSize: 14, fontFamily: fonts.body, color: colors.text },
  input2: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48, paddingHorizontal: 14, fontSize: 14, fontFamily: fonts.body, color: colors.text, backgroundColor: '#FFF' },
  add: { backgroundColor: colors.navy, borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  addText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center' },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  date: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2, fontVariant: ['tabular-nums'] },
  desc: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  del: { color: colors.dangerDot, fontFamily: fonts.display, fontSize: 13 },
  badge: { backgroundColor: colors.royalSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeSheet: { backgroundColor: colors.successBg },
  badgeText: { fontSize: 10, fontFamily: fonts.display, color: colors.royal },
  badgeTextSheet: { color: colors.success },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
