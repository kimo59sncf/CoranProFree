import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Artwork } from '@/components/Artwork';
import { Waveform } from '@/components/Waveform';
import { getAyahs } from '@/data/quran';
import { useAudio, REPEAT_COUNT_OPTIONS } from '@/context/AudioContext';
import { useColors } from '@/hooks/useColors';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useLanguage } from '@/context/LanguageContext';
import { useBookmarks } from '@/context/BookmarksContext';
import { useProgress } from '@/context/ProgressContext';
import * as Clipboard from 'expo-clipboard';

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

export default function PlayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const networkStatus = useNetworkStatus();
  const { t } = useLanguage();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { recordReading, addListeningTime } = useProgress();
  const {
    currentSurah,
    currentAyah,
    reciter,
    isPlaying,
    isBuffering,
    position,
    duration,
    progress,
    speed,
    repeatMode,
    repeatCount,
    completedRepeats,
    rangeStart,
    rangeEnd,
    sleepTimerMinutes,
    favoriteIds,
    downloads,
    audioError,
    togglePlayback,
    retry,
    seek,
    seekProgress,
    seekAyah,
    nextSurah,
    previousSurah,
    skipAyah,
    setSpeed,
    setRepeatMode,
    setRepeatCount,
    setSleepTimer,
    toggleFavorite,
    downloadSurah,
  } = useAudio();
  const [showOptions, setShowOptions] = useState(false);
  const [waveformWidth, setWaveformWidth] = useState(1);
  const ayahs = useMemo(() => getAyahs(currentSurah.id), [currentSurah.id]);
  const activeAyah = Math.min(ayahs.length, Math.max(1, currentAyah));
  const favorite = favoriteIds.includes(currentSurah.id);
  const downloadRecord = downloads.find((record) => record.surahId === currentSurah.id);
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const repeatLabel = repeatMode === 'off' ? 'Off' : repeatMode === 'ayah' ? 'Ayah' : repeatMode === 'surah' ? 'Surah' : 'Range';
  const isDownloading = downloadRecord?.status === 'downloading';
  const isDownloaded = downloadRecord?.status === 'complete';

  const setTimer = () => setSleepTimer(sleepTimerMinutes ? null : 15);

  const onWaveformLayout = (event: LayoutChangeEvent) => setWaveformWidth(event.nativeEvent.layout.width);
  const onSeek = (locationX: number) => seekProgress(Math.max(0, Math.min(1, locationX / waveformWidth)));

  const chapterDetails = `${currentSurah.ayahCount} ayahs · ${reciter.name}`;

  const isAyahBookmarked = isBookmarked(currentSurah.id, currentAyah);
  const activeArabic = ayahs[activeAyah - 1]?.arabic ?? '';

  const shareAyah = async () => {
    const message = `${activeArabic}\n\n${currentSurah.transliteration} — ${currentAyah}\nCoranProFree`;
    try {
      await Share.share({ message });
    } catch {
      // Partager peut être indisponible sur certaines plateformes.
    }
  };

  const copyAyah = async () => {
    try {
      await Clipboard.setStringAsync(activeArabic);
    } catch {
      // La copie peut échouer silencieusement.
    }
  };

  useEffect(() => {
    recordReading(currentSurah.id, currentAyah);
  }, [currentSurah.id, currentAyah, recordReading]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => addListeningTime(1000), 1000);
    return () => clearInterval(interval);
  }, [isPlaying, addListeningTime]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable testID="close-player" onPress={() => router.back()} hitSlop={12} style={styles.iconButton}>
          <Feather name="chevron-down" size={25} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.mutedForeground }]}>{t('player.nowPlaying')}</Text>
        <Pressable onPress={() => setShowOptions((visible) => !visible)} hitSlop={12} style={styles.iconButton}>
          <Feather name="more-horizontal" size={23} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.artworkWrap}>
          <Artwork kind={currentSurah.cover} size={286} />
        </View>
        <View style={styles.titleBlock}>
          <View style={styles.chapterCopy}>
            <Text style={[styles.chapter, { color: colors.foreground }]}>{currentSurah.transliteration}</Text>
            <Text style={[styles.chapterArabic, { color: colors.primary }]}>{currentSurah.arabic}</Text>
            <Text style={[styles.chapterMeta, { color: colors.mutedForeground }]}>{chapterDetails}</Text>
          </View>
          <View style={styles.titleActions}>
            <Pressable accessibilityLabel={favorite ? 'Remove favorite' : 'Add favorite'} onPress={() => toggleFavorite(currentSurah.id)} hitSlop={10}>
              <Feather name="heart" size={21} color={favorite ? colors.accent : colors.mutedForeground} />
            </Pressable>
            <Pressable
              accessibilityLabel={isDownloaded ? 'Remove offline audio in Library' : 'Download this surah for offline listening'}
              onPress={() => {
                if (!isDownloaded && !isDownloading) void downloadSurah(currentSurah);
                else router.push('/library');
              }}
              hitSlop={10}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name={isDownloaded ? 'check-circle' : 'download'} size={20} color={isDownloaded ? colors.primary : colors.mutedForeground} />
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.verseActions}>
          <Pressable
            accessibilityLabel={isAyahBookmarked ? t('common.removeBookmark') : t('common.bookmark')}
            onPress={() => toggleBookmark(currentSurah.id, currentAyah)}
            hitSlop={10}
            style={styles.verseAction}
          >
            <Feather name="bookmark" size={18} color={isAyahBookmarked ? colors.accent : colors.mutedForeground} />
          </Pressable>
          <Pressable accessibilityLabel={t('common.share')} onPress={() => { void shareAyah(); }} hitSlop={10} style={styles.verseAction}>
            <Feather name="share-2" size={18} color={colors.mutedForeground} />
          </Pressable>
          <Pressable accessibilityLabel={t('common.copy')} onPress={() => { void copyAyah(); }} hitSlop={10} style={styles.verseAction}>
            <Feather name="copy" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.waveform} onLayout={onWaveformLayout}>
          <Waveform progress={progress} />
          <Pressable
            testID="seek-track"
            accessibilityLabel="Seek within this surah"
            onPress={(event) => onSeek(event.nativeEvent.locationX)}
            style={styles.seekOverlay}
          />
        </View>
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: colors.foreground }]}>
            {t('common.ayah')} {activeAyah} / {currentSurah.ayahCount}
          </Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {isBuffering ? t('player.loadingAudio') : `${formatTime(position)} / ${formatTime(duration)}`}
          </Text>
        </View>

        {audioError && (
          <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.destructive }]}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{audioError}</Text>
            <Pressable onPress={retry} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('player.retry')} style={[styles.retryBtn, { backgroundColor: colors.destructive }]}>
              <Text style={[styles.retryText, { color: colors.destructiveForeground }]}>{t('player.retry')}</Text>
            </Pressable>
          </View>
        )}

        {isDownloaded && (
          <View style={[styles.offlineBadge, { backgroundColor: colors.secondary }]}>
            <Feather name="wifi-off" size={12} color={colors.primary} />
            <Text style={[styles.offlineText, { color: colors.primary }]}>{t('player.availableOffline')}</Text>
          </View>
        )}
        {!isDownloaded && networkStatus === 'offline' && (
          <View style={[styles.offlineBadge, { backgroundColor: colors.destructive }]}>
            <Feather name="wifi-off" size={12} color="#FFFFFF" />
            <Text style={[styles.offlineText, { color: '#FFFFFF' }]}>{t('player.notAvailableOffline')}</Text>
          </View>
        )}

        <View style={styles.controls}>
          <Pressable accessibilityLabel="Previous surah" onPress={previousSurah} hitSlop={14}>
            <Feather name="skip-back" size={23} color={colors.foreground} />
          </Pressable>
          <Pressable accessibilityLabel="Previous ayah" onPress={() => skipAyah(-1)} hitSlop={12}>
            <Feather name="rewind" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable
            testID="main-play-button"
            accessibilityLabel={isPlaying ? 'Pause recitation' : 'Play recitation'}
            accessibilityRole="button"
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              togglePlayback();
            }}
            style={[styles.mainPlay, { backgroundColor: colors.primary }]}
          >
            <Feather name={isPlaying ? 'pause' : 'play'} size={26} color={colors.primaryForeground} />
          </Pressable>
          <Pressable accessibilityLabel="Next ayah" onPress={() => skipAyah(1)} hitSlop={12}>
            <Feather name="fast-forward" size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable accessibilityLabel="Next surah" onPress={nextSurah} hitSlop={14}>
            <Feather name="skip-forward" size={23} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={[styles.toolRow, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <Pressable style={styles.tool} onPress={() => setRepeatMode(repeatMode === 'off' ? 'ayah' : repeatMode === 'ayah' ? 'surah' : repeatMode === 'surah' ? 'range' : 'off')}>
            <Feather name="repeat" size={18} color={repeatMode === 'off' ? colors.mutedForeground : colors.accent} />
            <Text style={[styles.toolLabel, { color: repeatMode === 'off' ? colors.mutedForeground : colors.accent }]}>{repeatLabel}</Text>
          </Pressable>
          <Pressable style={styles.tool} onPress={setTimer}>
            <Feather name="moon" size={18} color={sleepTimerMinutes ? colors.accent : colors.mutedForeground} />
            <Text style={[styles.toolLabel, { color: sleepTimerMinutes ? colors.accent : colors.mutedForeground }]}>{sleepTimerMinutes ? `${sleepTimerMinutes} min` : t('player.sleepTimer')}</Text>
          </Pressable>
          <Pressable style={styles.tool} onPress={() => setShowOptions((visible) => !visible)}>
            <Feather name="sliders" size={18} color={colors.mutedForeground} />
            <Text style={[styles.toolLabel, { color: colors.mutedForeground }]}>{speed}x</Text>
          </Pressable>
        </View>

        {showOptions && (
          <View style={[styles.options, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.optionHeader}>
              <Text style={[styles.optionTitle, { color: colors.foreground }]}>{t('player.settings')}</Text>
              <Pressable onPress={() => setShowOptions(false)}><Feather name="x" size={18} color={colors.mutedForeground} /></Pressable>
            </View>
            <Text style={[styles.optionLabel, { color: colors.mutedForeground }]}>{t('player.speed')}</Text>
            <View style={styles.optionChoices}>
              {speeds.map((option) => (
                <Pressable key={option} onPress={() => setSpeed(option)} style={[styles.choice, { backgroundColor: speed === option ? colors.primary : colors.secondary }]}>
                  <Text style={[styles.choiceText, { color: speed === option ? colors.primaryForeground : colors.secondaryForeground }]}>{option}x</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.optionLabel, { color: colors.mutedForeground }]}>{t('player.repeatCount')}</Text>
            <View style={styles.optionChoices}>
              {REPEAT_COUNT_OPTIONS.map((option) => {
                const selected = repeatCount === option;
                const label = option === Infinity ? '∞' : `${option}×`;
                return (
                  <Pressable key={String(option)} onPress={() => setRepeatCount(option)} style={[styles.choice, { backgroundColor: selected ? colors.primary : colors.secondary }]}>
                    <Text style={[styles.choiceText, { color: selected ? colors.primaryForeground : colors.secondaryForeground }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {repeatMode === 'range' && (
              <Text style={[styles.rangeHint, { color: colors.mutedForeground }]}>
                {t('player.range')} {rangeStart} → {rangeEnd}
              </Text>
            )}
            {repeatMode !== 'off' && (
              <Text style={[styles.repeatHint, { color: colors.accent }]}>
                {repeatCount === Infinity
                  ? t('player.repeatHintInfinite')
                  : `${t('player.repeatHint')} ${Math.min(completedRepeats + 1, repeatCount)} / ${repeatCount}`}
              </Text>
            )}
          </View>
        )}

        <View style={styles.ayahHeader}>
          <Text style={[styles.ayahHeading, { color: colors.foreground }]}>{t('player.fullText')}</Text>
          <View style={[styles.livePill, { backgroundColor: colors.secondary }]}>
            <View style={[styles.liveDot, { backgroundColor: isPlaying ? colors.primary : colors.mutedForeground }]} />
            <Text style={[styles.liveText, { color: isPlaying ? colors.primary : colors.mutedForeground }]}>{isBuffering ? t('common.loading') : t('player.ayahSync')}</Text>
          </View>
        </View>
        <View style={[styles.transcript, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {ayahs.map((ayah) => (
            <Pressable
              key={ayah.id}
              onPress={() => seekAyah(ayah.id)}
              style={[styles.ayah, ayah.id === activeAyah && { backgroundColor: colors.secondary, borderRadius: 14 }]}
            >
              <Text style={[styles.ayahNumber, { color: ayah.id === activeAyah ? colors.accent : colors.mutedForeground }]}>{ayah.id}</Text>
              <View style={styles.ayahCopy}>
                <Text style={[styles.ayahArabic, { color: ayah.id === activeAyah ? colors.foreground : colors.mutedForeground }]}>{ayah.arabic}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  topTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  iconButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 25 },
  artworkWrap: { alignItems: 'center', marginTop: 20, marginBottom: 25 },
  titleBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chapterCopy: { flex: 1, gap: 4 },
  chapter: { fontSize: 26, fontWeight: '600', letterSpacing: -0.6 },
  chapterArabic: { fontSize: 17, textAlign: 'left' },
  chapterMeta: { fontSize: 12, marginTop: 2 },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingLeft: 12 },
  waveform: { height: 55, marginTop: 24, position: 'relative', justifyContent: 'center' },
  seekOverlay: StyleSheet.absoluteFill,
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { fontSize: 10, fontVariant: ['tabular-nums'] },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 14 },
  errorText: { flex: 1, fontSize: 11, lineHeight: 16 },
  retryBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  retryText: { fontSize: 11, fontWeight: '600' },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 12 },
  offlineText: { fontSize: 11, fontWeight: '600' },
  rangeHint: { fontSize: 11, marginTop: 2 },
  verseActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  verseAction: { padding: 6 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 21 },
  mainPlay: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  toolRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderBottomWidth: 1, marginTop: 27, paddingVertical: 17 },
  tool: { alignItems: 'center', gap: 6, minWidth: 70 },
  toolLabel: { fontSize: 10, fontWeight: '600' },
  options: { borderWidth: 1, borderRadius: 18, padding: 15, marginTop: 16, gap: 13 },
  optionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionTitle: { fontSize: 14, fontWeight: '600' },
  optionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.3 },
  optionChoices: { flexDirection: 'row', gap: 8 },
  choice: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  choiceText: { fontSize: 11, fontWeight: '600' },
  repeatHint: { fontSize: 11 },
  ayahHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 31, marginBottom: 11 },
  ayahHeading: { fontSize: 18, fontWeight: '600' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  liveText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  transcript: { borderRadius: 18, borderWidth: 1, padding: 7 },
  ayah: { flexDirection: 'row', padding: 12, gap: 12 },
  ayahNumber: { fontSize: 11, fontWeight: '700', width: 24, paddingTop: 3 },
  ayahCopy: { flex: 1, alignItems: 'flex-end', gap: 6 },
  ayahArabic: { fontSize: 19, textAlign: 'right', lineHeight: 33 },
});
