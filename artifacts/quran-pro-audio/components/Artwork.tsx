import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CoverKind } from '@/data/quran';
import { useColors } from '@/hooks/useColors';

const covers = {
  recitation: require('@/assets/images/recitation-cover.png'),
  learning: require('@/assets/images/learning-cover.png'),
};

export function Artwork({
  kind,
  size,
  rounded = true,
}: {
  kind: CoverKind;
  size: number;
  rounded?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: rounded ? 18 : 0 }]}>
      <Image source={covers[kind]} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={[`${colors.background}10`, `${colors.background}B8`]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, { backgroundColor: colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', position: 'relative' },
  glow: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    right: 16,
    bottom: 16,
    opacity: 0.9,
  },
});