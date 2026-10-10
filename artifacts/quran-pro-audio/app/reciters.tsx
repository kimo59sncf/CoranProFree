import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { reciters } from '@/data/quran';
import { useAudio } from '@/context/AudioContext';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

export default function RecitersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { reciter, setReciter, selectSurah, currentSurah } = useAudio();

  const chooseReciter = async (id: string) => {
    await Haptics.selectionAsync();
    setReciter(id);
  };

  const playNow = async (id: string) => {
    await Haptics.selectionAsync();
    setReciter(id);
    selectSurah(currentSurah);
    router.back();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={reciters}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('reciters.back')}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('reciters.title')}</Text>
              <Text style={[styles.heading, { color: colors.foreground }]}>{t('reciters.heading')}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.id === reciter.id;
          const disabled = !item.enabled;
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: isActive ? colors.primary : colors.border, opacity: disabled ? 0.5 : 1 }]}>
              <Pressable
                testID={`reciter-${item.id}`}
                onPress={() => chooseReciter(item.id)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={disabled ? `${item.name} — ${t('reciters.soon')}` : `${item.name} — ${t('reciters.select')}`}
                accessibilityState={{ selected: isActive, disabled }}
                style={({ pressed }) => [styles.cardMain, { opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={[styles.avatar, { backgroundColor: item.color }]}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />
                  ) : (
                    <Text style={styles.avatarText}>{item.initials}</Text>
                  )}
                </View>
                <View style={styles.copy}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                    {isActive ? (
                      <View style={[styles.activePill, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.activeText, { color: colors.primaryForeground }]}>{t('reciters.active')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.arabicName, { color: colors.foreground }]}>{item.arabicName}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.style} · {item.language}</Text>
                  {disabled ? (
                    <Text style={[styles.unavailable, { color: colors.mutedForeground }]}>{t('reciters.soon')}</Text>
                  ) : (
                    <View style={styles.availableRow}>
                      <Feather name="check-circle" size={13} color={colors.primary} />
                      <Text style={[styles.availableText, { color: colors.primary }]}>{t('reciters.available')}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
              {!disabled && !isActive ? (
                <Pressable
                  testID={`reciter-play-${item.id}`}
                  onPress={() => playNow(item.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('reciters.playWith')} ${item.name}`}
                  style={[styles.action, { backgroundColor: colors.primary }]}
                >
                  <Feather name="play" size={17} color={colors.primaryForeground} />
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 11 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 23 },
  headerCopy: { gap: 6 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  heading: { fontSize: 28, fontWeight: '600', letterSpacing: -0.7 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 12, gap: 12 },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  copy: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 14, fontWeight: '600' },
  arabicName: { fontSize: 13 },
  meta: { fontSize: 11 },
  activePill: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  activeText: { fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  unavailable: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  availableRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  availableText: { fontSize: 10, fontWeight: '600' },
  action: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});