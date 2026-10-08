import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

type Source = { name: string; detail: string; license: string };

const SOURCES: Source[] = [
  { name: 'Texte arabe (Uthmani)', detail: 'Corpus Uthmani standardisé (Tanzil / KFGQPC)', license: 'Licence à confirmer' },
  { name: 'Audio — Mishary Alafasy', detail: 'EveryAyah.com · Murattal · 128 kbps', license: 'Licence à confirmer' },
  { name: 'Traduction FR — M. Hamidullah', detail: 'Tanzil / alquran.cloud', license: 'Non intégrée · licence à confirmer' },
  { name: 'Traduction EN — Saheeh International', detail: 'Tanzil / alquran.cloud', license: 'Non intégrée · licence à confirmer' },
  { name: 'Traduction AR — التفسير الميسّر', detail: 'King Fahd Quran Complex', license: 'Non intégrée · licence à confirmer' },
];

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('reciters.back')}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>{t('about.title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.appName, { color: colors.foreground }]}>CoranProFree</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>{t('about.tagline')}</Text>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t('about.sources')}</Text>
        {SOURCES.map((source) => (
          <View key={source.name} style={[styles.sourceRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sourceCopy}>
              <Text style={[styles.sourceName, { color: colors.foreground }]}>{source.name}</Text>
              <Text style={[styles.sourceDetail, { color: colors.mutedForeground }]}>{source.detail}</Text>
            </View>
            <Text style={[styles.sourceLicense, { color: colors.accent }]}>{source.license}</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t('about.privacy')}</Text>
        <Text style={[styles.privacyText, { color: colors.foreground }]}>{t('about.privacyText')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 52 },
  title: { fontSize: 18, fontWeight: '600' },
  content: { paddingHorizontal: 22, paddingTop: 12 },
  appName: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6 },
  tagline: { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', marginTop: 18, marginBottom: 10 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  sourceCopy: { flex: 1, gap: 3 },
  sourceName: { fontSize: 14, fontWeight: '600' },
  sourceDetail: { fontSize: 12 },
  sourceLicense: { fontSize: 10, fontWeight: '700' },
  privacyText: { fontSize: 13, lineHeight: 20 },
});
