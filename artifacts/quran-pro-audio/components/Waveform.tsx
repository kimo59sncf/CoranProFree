import { View, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

const bars = [0.28, 0.52, 0.38, 0.72, 0.48, 0.9, 0.58, 0.36, 0.68, 0.84, 0.46, 0.72, 0.31, 0.63, 0.5, 0.78, 0.42, 0.88, 0.56, 0.34, 0.7, 0.44, 0.62, 0.32, 0.52, 0.8, 0.46, 0.68, 0.36, 0.58, 0.74, 0.4];

export function Waveform({ progress = 0 }: { progress?: number }) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      {bars.map((height, index) => (
        <View
          key={index}
          style={[
            styles.bar,
            {
              height: 8 + height * 38,
              backgroundColor: index / bars.length < progress ? colors.primary : colors.border,
              opacity: index / bars.length < progress ? 1 : 0.75,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', height: 54, gap: 3 },
  bar: { width: 3, borderRadius: 2 },
});