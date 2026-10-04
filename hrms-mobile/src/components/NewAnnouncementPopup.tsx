import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';
import { useUnseen } from '../services/seen';
import { colors, fonts, radius } from '../theme';

/**
 * App-open popup: "You have N new announcement(s)".
 * Later snoozes for this launch only; View marks seen + opens notices.
 */
export function NewAnnouncementPopup() {
  const { user, role } = useAuth();
  const { unseen, markSeen } = useUnseen();
  const [visible, setVisible] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (!user || checked.current || unseen.length === 0) return;
    checked.current = true;
    setVisible(true);
  }, [user, unseen.length]);

  // New login session re-checks
  useEffect(() => {
    checked.current = false;
    setVisible(false);
  }, [user?.id]);

  const onView = async () => {
    await markSeen();
    setVisible(false);
    router.push(
      (role === 'admin' ? '/(admin)/announcements' : '/(employee)/announcements') as never,
    );
  };

  if (!visible || unseen.length === 0) return null;
  const fresh = unseen.slice(0, 4);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setVisible(false)}>
      <View style={styles.dim}>
        <View style={styles.card}>
          <View style={styles.bell}>
            <Ionicons name="notifications" size={26} color="#FFF" />
          </View>
          <Text style={styles.title}>
            You have {unseen.length} new announcement{unseen.length === 1 ? '' : 's'}
          </Text>
          {fresh.map((f) => (
            <Text key={`${f.kind}-${f.id}`} style={styles.item} numberOfLines={2}>
              • {f.title}
            </Text>
          ))}
          <View style={styles.btns}>
            <Pressable style={styles.later} onPress={() => setVisible(false)}>
              <Text style={styles.laterText}>Later</Text>
            </Pressable>
            <Pressable style={styles.view} onPress={onView}>
              <Text style={styles.viewText}>View</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  bell: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 17, fontFamily: fonts.displayExtra, color: colors.text, textAlign: 'center' },
  item: { fontSize: 13, fontFamily: fonts.body, color: colors.muted, textAlign: 'center' },
  btns: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  later: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterText: { color: colors.text, fontFamily: fonts.display, fontSize: 14 },
  view: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: radius.md,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewText: { color: '#FFF', fontFamily: fonts.display, fontSize: 14 },
});
