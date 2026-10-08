import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { reciters, surahs, type Surah } from '@/data/quran';
import { REPEAT_COUNT_OPTIONS, useAudio } from '@/context/AudioContext';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

export default function HifzScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { reciter, currentSurah, startHifz } = useAudio();

  const [surah, setSurah] = useState<Surah>(currentSurah);
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(currentSurah.ayahCount);
  const [reciterId, setReciterId] = useState(reciter.id);
  const [speed, setSpeed] = useState(1);
  const [count, setCount] = useState(5);
  const [pickerVisible, setPickerVisible] = useState(false);

  const enabledReciters = useMemo(() => reciters.filter((r) => r.enabled), []);

  const adjust = (kind: 'start' | 'end', delta: number) => {
    if (kind === 'start') setStart((value) => Math.max(1, Math.min(end, value + delta)));
    else setEnd((value) => Math.max(start, Math.min(surah.ayahCount, value + delta)));
  };

  const begin = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startHifz(surah.id, start, end, speed, count, reciterId);
    router.replace('/player');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('reciters.back')}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.mutedForeground }]}>{t('hifz.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.heading, { color: colors.foreground }]}>{t('hifz.heading')}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('hifz.subtitle')}</Text>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('hifz.surah')}</Text>
        <Pressable onPress={() => setPickerVisible(true)} style={[styles.selectBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.selectText, { color: colors.foreground }]} numberOfLines={1}>{surah.transliteration} · {surah.arabic}</Text>
          <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
        </Pressable>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('hifz.range')}</Text>
        <View style={styles.rangeRow}>
          <View style={styles.stepper}>
            <Text style={[styles.stepperLabel, { color: colors.mutedForeground }]}>{t('hifz.start')}</Text>
            <View style={styles.stepperControls}>
              <Pressable onPress={() => adjust('start', -1)} style={[styles.stepperBtn, { backgroundColor: colors.secondary }]}><Text style={{ color: colors.foreground }}>−</Text></Pressable>
              <Text style={[styles.stepperValue, { color: colors.foreground }]}>{start}</Text>
              <Pressable onPress={() => adjust('start', 1)} style={[styles.stepperBtn, { backgroundColor: colors.secondary }]}><Text style={{ color: colors.foreground }}>+</Text></Pressable>
            </View>
          </View>
          <View style={styles.stepper}>
            <Text style={[styles.stepperLabel, { color: colors.mutedForeground }]}>{t('hifz.end')}</Text>
            <View style={styles.stepperControls}>
              <Pressable onPress={() => adjust('end', -1)} style={[styles.stepperBtn, { backgroundColor: colors.secondary }]}><Text style={{ color: colors.foreground }}>−</Text></Pressable>
              <Text style={[styles.stepperValue, { color: colors.foreground }]}>{end}</Text>
              <Pressable onPress={() => adjust('end', 1)} style={[styles.stepperBtn, { backgroundColor: colors.secondary }]}><Text style={{ color: colors.foreground }}>+</Text></Pressable>
            </View>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('hifz.reciter')}</Text>
        <View style={styles.chips}>
          {enabledReciters.map((r) => {
            const selected = r.id === reciterId;
            return (
              <Pressable key={r.id} onPress={() => setReciterId(r.id)} style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.secondary }]}>
                <Text style={[styles.chipText, { color: selected ? colors.primaryForeground : colors.secondaryForeground }]}>{r.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('hifz.speed')}</Text>
        <View style={styles.chips}>
          {SPEEDS.map((s) => {
            const selected = s === speed;
            return (
              <Pressable key={s} onPress={() => setSpeed(s)} style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.secondary }]}>
                <Text style={[styles.chipText, { color: selected ? colors.primaryForeground : colors.secondaryForeground }]}>{s}x</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('hifz.repetitions')}</Text>
        <View style={styles.chips}>
          {REPEAT_COUNT_OPTIONS.map((c) => {
            const selected = c === count;
            const label = c === Infinity ? '∞' : `${c}×`;
            return (
              <Pressable key={String(c)} onPress={() => setCount(c)} style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.secondary }]}>
                <Text style={[styles.chipText, { color: selected ? colors.primaryForeground : colors.secondaryForeground }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={begin} accessibilityRole="button" style={[styles.begin, { backgroundColor: colors.primary }]}>
          <Text style={[styles.beginText, { color: colors.primaryForeground }]}>{t('hifz.begin')}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t('hifz.chooseSurah')}</Text>
              <Pressable onPress={() => setPickerVisible(false)} hitSlop={8}><Feather name="x" size={22} color={colors.foreground} /></Pressable>
            </View>
            <FlatList
              data={surahs}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => { setSurah(item); setStart(1); setEnd(item.ayahCount); setPickerVisible(false); }}
                  style={[styles.surahRow, { borderBottomColor: colors.border }]}
                >
                  <Text style={[styles.surahNumber, { color: colors.mutedForeground }]}>{item.id}</Text>
                  <View style={styles.surahCopy}>
                    <Text style={[styles.surahName, { color: colors.foreground }]}>{item.transliteration}</Text>
                    <Text style={[styles.surahArabic, { color: colors.mutedForeground }]}>{item.arabic}</Text>
                  </View>
                  <Text style={[styles.surahCount, { color: colors.mutedForeground }]}>{item.ayahCount}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  topTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  content: { paddingHorizontal: 22, paddingTop: 8 },
  heading: { fontSize: 28, fontWeight: '600', letterSpacing: -0.7 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 22 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3, marginTop: 18, marginBottom: 8 },
  selectBox: { minHeight: 52, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, gap: 10 },
  selectText: { flex: 1, fontSize: 14, fontWeight: '600' },
  rangeRow: { flexDirection: 'row', gap: 14 },
  stepper: { flex: 1 },
  stepperLabel: { fontSize: 10, fontWeight: '600', marginBottom: 6 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 18, fontWeight: '600', minWidth: 28, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  chipText: { fontSize: 12, fontWeight: '600' },
  begin: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginTop: 32 },
  beginText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  surahRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  surahNumber: { fontSize: 12, fontWeight: '600', width: 28 },
  surahCopy: { flex: 1, gap: 2 },
  surahName: { fontSize: 14, fontWeight: '600' },
  surahArabic: { fontSize: 12 },
  surahCount: { fontSize: 12 },
});
