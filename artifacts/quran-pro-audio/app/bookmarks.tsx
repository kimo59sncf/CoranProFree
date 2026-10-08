import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAyahs, surahs } from '@/data/quran';
import { useBookmarks } from '@/context/BookmarksContext';
import { useAudio } from '@/context/AudioContext';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

export default function BookmarksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { bookmarks, removeBookmark } = useBookmarks();
  const { selectSurahAt } = useAudio();

  const sorted = [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);

  const open = (surahId: number, ayahId: number) => {
    const surah = surahs.find((item) => item.id === surahId);
    if (!surah) return;
    selectSurahAt(surah, ayahId);
    router.push('/player');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('reciters.back')}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{t('fav.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bookmark" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('fav.empty')}</Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>{t('fav.emptyHint')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const surah = surahs.find((s) => s.id === item.surahId);
          const ayahText = getAyahs(item.surahId).find((a) => a.id === item.ayahId)?.arabic ?? '';
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={() => open(item.surahId, item.ayahId)} style={styles.cardMain}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.surahName, { color: colors.foreground }]}>{surah?.transliteration ?? `Sourate ${item.surahId}`}</Text>
                  <Text style={[styles.ref, { color: colors.accent }]}>Verset {item.ayahId}</Text>
                </View>
                <Text style={[styles.arabic, { color: colors.foreground }]} numberOfLines={3}>{ayahText}</Text>
              </Pressable>
              <Pressable onPress={() => removeBookmark(item.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.removeBookmark')} style={styles.remove}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, borderWidth: 1, padding: 14 },
  cardMain: { flex: 1, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  surahName: { fontSize: 14, fontWeight: '600' },
  ref: { fontSize: 11, fontWeight: '700' },
  arabic: { fontSize: 17, textAlign: 'right', lineHeight: 28 },
  remove: { padding: 6 },
  empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 25, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyHint: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 280 },
});
