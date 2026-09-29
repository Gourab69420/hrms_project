import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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
import { downloadDocUrl, loadToken } from '../../services/api';
import { useMyDocs } from '../../services/useHrms';
import { colors, fonts } from '../../theme';

/** My HR documents — offer letter, ID proofs, contracts. Tap to download/share. */
export default function Documents() {
  const { data, isLoading, error, refetch } = useMyDocs();

  const open = async (fileName: string, id: number) => {
    try {
      const target = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${fileName}`;
      const dl = await FileSystem.downloadAsync(downloadDocUrl(id), target, {
        headers: { Authorization: `Bearer ${(await loadToken()) ?? ''}` },
      });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dl.uri);
      else Alert.alert('Saved', dl.uri);
    } catch (e) {
      Alert.alert('Download failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <AppBar title="Documents" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}>
        {isLoading && <ActivityIndicator color={colors.navy} style={{ marginTop: 16 }} />}
        {error && (
          <Card>
            <Text style={styles.err}>{error}</Text>
          </Card>
        )}
        {data.map((d) => (
          <Pressable key={d.id} onPress={() => open(d.file_name, d.id)}>
            <Card style={styles.row}>
              <Text style={styles.icon}>📄</Text>
              <View style={styles.mid}>
                <Text style={styles.name}>{d.file_name}</Text>
                <Text style={styles.meta}>
                  {d.doc_type} • {d.created_at.slice(0, 10)}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))}
        {!isLoading && data.length === 0 && (
          <Card>
            <Text style={styles.muted}>No documents yet — HR uploads offer letters and ID proofs here.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 24 },
  mid: { flex: 1 },
  name: { fontSize: 14, fontFamily: fonts.display, color: colors.text },
  meta: { fontSize: 12, fontFamily: fonts.body, color: colors.muted, marginTop: 2 },
  muted: { color: colors.muted, fontFamily: fonts.body, textAlign: 'center' },
  err: { color: colors.dangerDot, fontFamily: fonts.body },
});
