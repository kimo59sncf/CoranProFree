import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Artwork } from '@/components/Artwork';
import { useAudio } from '@/context/AudioContext';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

export function MiniPlayer() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const { currentSurah, currentAyah, reciter, progress, isPlaying, hasActiveAudio, togglePlayback, skipAyah } = useAudio();

  if (!hasActiveAudio) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable
        testID="mini-player"
        onPress={() => router.push('/player')}
        accessibilityRole="button"
        accessibilityLabel={`${t('mini.openPlayer')} — ${currentSurah.transliteration}`}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Artwork kind={currentSurah.cover} size={48} />
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: colors.mutedForeground }]}>{`${t('common.ayah').toUpperCase()} ${currentAyah} / ${currentSurah.ayahCount}`}</Text>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {currentSurah.transliteration}
          </Text>
          <Text style={[styles.reciter, { color: colors.mutedForeground }]} numberOfLines={1}>
            {reciter.name}
          </Text>
        </View>
      </Pressable>
      <Pressable
        testID="mini-prev"
        accessibilityLabel={t('mini.previousAyah')}
        accessibilityRole="button"
        onPress={() => skipAyah(-1)}
        hitSlop={10}
        style={styles.secondaryButton}
      >
        <Feather name="skip-back" size={18} color={colors.foreground} />
      </Pressable>
      <Pressable
        testID="mini-play-button"
        accessibilityLabel={isPlaying ? t('mini.pause') : t('mini.play')}
        accessibilityRole="button"
        onPress={togglePlayback}
        hitSlop={12}
        style={[styles.play, { backgroundColor: colors.primary }]}
      >
        <Feather name={isPlaying ? 'pause' : 'play'} size={18} color={colors.primaryForeground} />
      </Pressable>
      <Pressable
        testID="mini-next"
        accessibilityLabel={t('mini.nextAyah')}
        accessibilityRole="button"
        onPress={() => skipAyah(1)}
        hitSlop={10}
        style={styles.secondaryButton}
      >
        <Feather name="skip-forward" size={18} color={colors.foreground} />
      </Pressable>
      <View style={[styles.progress, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  copy: { flex: 1, gap: 3 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  kicker: { fontSize: 9, fontWeight: '700', letterSpacing: 1.3 },
  title: { fontSize: 15, fontWeight: '600' },
  reciter: { fontSize: 11 },
  secondaryButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  play: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  progress: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2 },
  progressFill: { height: 2 },
});