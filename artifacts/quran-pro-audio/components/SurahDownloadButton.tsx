import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Surah } from '@/data/quran';
import type { DownloadRecord } from '@/services/audio/AudioDownloadManager';
import { useColors } from '@/hooks/useColors';

type Props = {
  surah: Surah;
  download?: DownloadRecord;
  busy: boolean;
  onPress: () => void;
  testID: string;
  style?: StyleProp<ViewStyle>;
};

export function SurahDownloadButton({
  surah,
  download,
  busy,
  onPress,
  testID,
  style,
}: Props) {
  const colors = useColors();
  const isComplete =
    download?.status === 'complete' &&
    download.downloadedAyahs >= surah.ayahCount;
  const iconName = isComplete
    ? 'cloud-check'
    : download?.status === 'downloading'
      ? 'cloud-sync-outline'
      : 'cloud-download-outline';
  const accessibilityLabel = isComplete
    ? `Manage offline audio for ${surah.transliteration}`
    : download?.status === 'downloading'
      ? `Pause download for ${surah.transliteration}`
      : download?.status === 'paused'
        ? `Resume download for ${surah.transliteration}`
        : `Download ${surah.transliteration} for offline listening`;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style,
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <MaterialCommunityIcons
          name={iconName}
          size={21}
          color={
            isComplete
              ? colors.success
              : download?.status === 'error'
                ? colors.destructive
                : download?.status === 'downloading'
                  ? colors.warning
                  : colors.mutedForeground
          }
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
