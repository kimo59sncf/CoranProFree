import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { surahs } from '@/data/quran';
import { searchQuran, type SearchResult } from '@/services/search';
import { useAudio } from '@/context/AudioContext';
import { useSearchHistory } from '@/context/SearchContext';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { selectSurah, selectSurahAt } = useAudio();
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const results = useMemo<SearchResult[]>(() => searchQuran(submitted, 50), [submitted]);

  const openResult = (result: SearchResult) => {
    const surah = surahs.find((item) => item.id === result.surahId);
    if (!surah) return;
    if (result.ayahId > 0) selectSurahAt(surah, result.ayahId);
    else selectSurah(surah);
    router.push('/player');
  };

  const submit = (text: string) => {
    setQuery(text);
    const trimmed = text.trim();
    setSubmitted(trimmed);
    if (trimmed) addToHistory(trimmed);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('reciters.back')}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={submit}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground }]}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => submit('')} hitSlop={8} accessibilityLabel={t('search.clear')}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {!submitted ? (
        <View style={styles.historyWrap}>
          {history.length > 0 ? (
            <>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: colors.mutedForeground }]}>{t('search.recent')}</Text>
                <Pressable onPress={clearHistory} hitSlop={8}>
                  <Text style={[styles.clearText, { color: colors.primary }]}>{t('search.clear')}</Text>
                </Pressable>
              </View>
              {history.map((item) => (
                <View key={item.at} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                  <Pressable onPress={() => submit(item.query)} style={styles.historyMain}>
                    <Feather name="clock" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.historyText, { color: colors.foreground }]}>{item.query}</Text>
                  </Pressable>
                  <Pressable onPress={() => removeFromHistory(item.query)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))}
            </>
          ) : (
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>{t('search.placeholder')}</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.type}-${item.surahId}-${item.ayahId}-${index}`}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('search.noResults')}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => openResult(item)} style={[styles.resultRow, { borderBottomColor: colors.border }]}>
              <View style={styles.resultHeader}>
                <Text style={[styles.resultSurah, { color: colors.foreground }]}>{item.surahTransliteration}</Text>
                <Text style={[styles.resultRef, { color: colors.accent }]}>
                  {item.type === 'surah' ? `Sourate ${item.surahId}` : `Sourate ${item.surahId} · Verset ${item.ayahId}`}
                </Text>
              </View>
              <Text style={[styles.resultArabic, { color: colors.foreground }]} numberOfLines={2}>
                {item.type === 'surah' ? item.surahArabic : item.excerpt}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  searchBox: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 14, paddingVertical: 8 },
  historyWrap: { paddingHorizontal: 20, paddingTop: 8 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  historyTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  clearText: { fontSize: 12, fontWeight: '600' },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  historyMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyText: { flex: 1, fontSize: 14 },
  emptyHint: { fontSize: 13, textAlign: 'center', marginTop: 30, opacity: 0.7 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  resultRow: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  resultSurah: { fontSize: 14, fontWeight: '600' },
  resultRef: { fontSize: 11, fontWeight: '600' },
  resultArabic: { fontSize: 16, textAlign: 'right', lineHeight: 26 },
});
