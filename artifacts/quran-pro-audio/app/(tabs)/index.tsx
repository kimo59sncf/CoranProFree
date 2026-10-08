import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Artwork } from '@/components/Artwork';
import { MiniPlayer } from '@/components/MiniPlayer';
import { SurahDownloadButton } from '@/components/SurahDownloadButton';
import { surahs, type Surah } from '@/data/quran';
import { useAudio } from '@/context/AudioContext';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useProgress } from '@/context/ProgressContext';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useLanguage();
  const dateLabel = new Date().toLocaleDateString(
    language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar' : 'en-US',
    { weekday: 'long', day: 'numeric', month: 'short' },
  );
  const { streak, listeningMs, versesRead } = useProgress();
  const {
    currentSurah,
    currentAyah,
    hasActiveAudio,
    selectSurah,
    isPlaying,
    favoriteIds,
    toggleFavorite,
    playlists,
    createPlaylist,
    toggleSurahInPlaylist,
    downloads,
    downloadSurah,
    pauseDownload,
    removeDownload,
  } = useAudio();
  const featured = useMemo(() => surahs.find((surah) => surah.featured) ?? surahs[0], []);
  const [menuSurah, setMenuSurah] = useState<Surah | null>(null);
  const [menuMode, setMenuMode] = useState<'actions' | 'playlists' | 'create'>('actions');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [menuError, setMenuError] = useState<string | null>(null);
  const [startingDownloadId, setStartingDownloadId] = useState<number | null>(null);
  const selectedDownload = menuSurah
    ? downloads.find((record) => record.surahId === menuSurah.id)
    : undefined;
  const isFavorite = menuSurah ? favoriteIds.includes(menuSurah.id) : false;
  const isStartingDownload =
    !!menuSurah &&
    startingDownloadId === menuSurah.id &&
    selectedDownload?.status !== 'downloading';

  const openSurah = async (surah = featured) => {
    await Haptics.selectionAsync();
    selectSurah(surah);
    router.push('/player');
  };

  const openSurahMenu = (surah: Surah) => {
    setMenuSurah(surah);
    setMenuMode('actions');
    setMenuError(null);
  };

  const closeSurahMenu = () => {
    setMenuSurah(null);
    setMenuMode('actions');
    setMenuError(null);
  };

  const handleCloudPress = async (surah: Surah) => {
    const record = downloads.find((item) => item.surahId === surah.id);
    if (record?.status === 'complete') {
      openSurahMenu(surah);
      return;
    }

    setMenuError(null);
    try {
      if (record?.status === 'downloading') {
        await pauseDownload(surah.id);
        return;
      }

      setStartingDownloadId(surah.id);
      const result = await downloadSurah(surah);
      if (result.status === 'error') {
        openSurahMenu(surah);
        setMenuError(result.error ?? 'The download could not be completed.');
      }
    } catch (error) {
      openSurahMenu(surah);
      setMenuError(error instanceof Error ? error.message : 'The audio could not be downloaded.');
    } finally {
      setStartingDownloadId((activeId) => activeId === surah.id ? null : activeId);
    }
  };

  const handleDownloadAction = async () => {
    if (!menuSurah) return;
    setMenuError(null);
    try {
      if (selectedDownload?.status === 'complete') {
        await removeDownload(menuSurah.id);
      } else if (selectedDownload?.status === 'downloading') {
        await pauseDownload(menuSurah.id);
      } else {
        setStartingDownloadId(menuSurah.id);
        const result = await downloadSurah(menuSurah);
        if (result.status === 'error') {
          setMenuError(result.error ?? 'The download could not be completed.');
        }
      }
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : 'The audio could not be downloaded.');
    } finally {
      setStartingDownloadId(null);
    }
  };

  const createPlaylistForSurah = async () => {
    if (!menuSurah || !newPlaylistName.trim()) return;
    setMenuError(null);
    try {
      const playlist = await createPlaylist(newPlaylistName);
      toggleSurahInPlaylist(playlist.id, menuSurah.id);
      setNewPlaylistName('');
      setMenuMode('playlists');
    } catch (error) {
      setMenuError(error instanceof Error ? error.message : 'The playlist could not be created.');
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 112 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled
        data={surahs.slice(1)}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.accent }]}>{dateLabel.toUpperCase()}</Text>
                <Text style={[styles.greeting, { color: colors.foreground }]}>{t('home.greeting')}</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable testID="search-button" onPress={() => router.push('/search')} accessibilityRole="button" accessibilityLabel={t('search.placeholder')} style={[styles.profile, { backgroundColor: colors.secondary }]}>
                  <Feather name="search" size={18} color={colors.primary} />
                </Pressable>
                <Pressable testID="bookmarks-button" onPress={() => router.push('/bookmarks')} accessibilityRole="button" accessibilityLabel={t('fav.title')} style={[styles.profile, { backgroundColor: colors.secondary }]}>
                  <Feather name="bookmark" size={18} color={colors.primary} />
                </Pressable>
                <Pressable testID="profile-button" style={[styles.profile, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.profileText, { color: colors.primary }]}>M</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.heroHeading}>
              <View>
                <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>{t('home.heroEyebrow')}</Text>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('home.heading')}</Text>
              </View>
              <Text style={[styles.arabicAccent, { color: colors.primary }]}>القرآن</Text>
            </View>

            {hasActiveAudio && (
              <Pressable testID="continue-reading" onPress={() => router.push('/player')} style={[styles.continueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Artwork kind={currentSurah.cover} size={48} />
                <View style={styles.continueCopy}>
                  <Text style={[styles.continueEyebrow, { color: colors.accent }]}>{t('home.eyebrow')}</Text>
                  <Text style={[styles.continueTitle, { color: colors.foreground }]} numberOfLines={1}>{currentSurah.transliteration}</Text>
                  <Text style={[styles.continueMeta, { color: colors.mutedForeground }]}>{t('common.ayah')} {currentAyah} / {currentSurah.ayahCount} · {Math.round((currentAyah / currentSurah.ayahCount) * 100)}%</Text>
                </View>
                <Text style={[styles.continueCta, { color: colors.primary }]}>{t('home.continue')}</Text>
              </Pressable>
            )}

            {versesRead > 0 && (
              <View style={styles.statsRow}>
                <Text style={[styles.statsTitle, { color: colors.mutedForeground }]}>{t('stats.title')}</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{streak}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t('stats.streak').replace('{n}', String(streak))}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{Math.max(1, Math.round(listeningMs / 60000))}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t('stats.listening').replace('{n}', String(Math.max(1, Math.round(listeningMs / 60000))))}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{versesRead}</Text>
                    <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t('stats.verses').replace('{n}', String(versesRead))}</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.featured, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SurahDownloadButton
                surah={featured}
                download={downloads.find((record) => record.surahId === featured.id)}
                busy={startingDownloadId === featured.id && downloads.find((record) => record.surahId === featured.id)?.status !== 'downloading'}
                onPress={() => { void handleCloudPress(featured); }}
                testID={`download-cloud-${featured.id}`}
                style={styles.featuredCloud}
              />
              <Pressable
                testID="featured-surah"
                onPress={() => openSurah(featured)}
                style={({ pressed }) => [styles.featuredMain, { opacity: pressed ? 0.94 : 1 }]}
              >
                <Artwork kind={featured.cover} size={104} />
                <View style={styles.featuredCopy}>
                  <View style={[styles.pill, { backgroundColor: colors.secondary }]}>
                    <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.pillText, { color: colors.secondaryForeground }]}>MISHARY ALAFASY</Text>
                  </View>
                  <Text style={[styles.featuredTitle, { color: colors.foreground }]}>{featured.transliteration}</Text>
                  <Text style={[styles.featuredSubtitle, { color: colors.mutedForeground }]}>{featured.translation}</Text>
                  <View style={styles.featuredBottom}>
                    <Text style={[styles.duration, { color: colors.mutedForeground }]}>{featured.verses} ayahs</Text>
                    <View style={[styles.circlePlay, { backgroundColor: colors.primary }]}>
                      <Feather name={isPlaying && currentSurah.id === featured.id ? 'pause' : 'play'} size={17} color={colors.primaryForeground} />
                    </View>
                  </View>
                </View>
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>{t('home.explore')}</Text>
              <Pressable onPress={() => router.push('/library')} hitSlop={10}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>{t('common.seeAll')}</Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <SurahDownloadButton
              surah={item}
              download={downloads.find((record) => record.surahId === item.id)}
              busy={startingDownloadId === item.id && downloads.find((record) => record.surahId === item.id)?.status !== 'downloading'}
              onPress={() => { void handleCloudPress(item); }}
              testID={`download-cloud-${item.id}`}
            />
            <Pressable
              testID={`surah-${item.id}`}
              onPress={() => openSurah(item)}
              style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.72 : 1 }]}
            >
              <Text style={[styles.number, { color: colors.accent }]}>{String(item.id).padStart(3, '0')}</Text>
              <Artwork kind={item.cover} size={52} />
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.transliteration}</Text>
                <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>{item.translation} · {item.verses} ayahs</Text>
              </View>
            </Pressable>
            <Pressable
              testID={`surah-actions-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Actions for ${item.transliteration}`}
              onPress={() => openSurahMenu(item)}
              style={({ pressed }) => [styles.rowActions, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="more-horizontal" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={[styles.footerArabic, { color: colors.primary }]}>وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا</Text>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>“And recite the Quran with measured recitation.”</Text>
          </View>
        }
      />
      <View style={[styles.miniDock, { bottom: insets.bottom + 74 }]}>
        <MiniPlayer />
      </View>
      <Modal
        visible={!!menuSurah}
        transparent
        animationType="slide"
        onRequestClose={closeSurahMenu}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.menuOverlay}>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + 20 }]}>
            {menuSurah && (
              <>
                <View style={styles.menuHeader}>
                  <View style={styles.menuHeadingCopy}>
                    <Text style={[styles.menuEyebrow, { color: colors.accent }]}>
                      {t('common.surah').toUpperCase()} {String(menuSurah.id).padStart(3, '0')}
                    </Text>
                    <Text style={[styles.menuTitle, { color: colors.foreground }]}>{menuSurah.transliteration}</Text>
                    <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>{menuSurah.translation}</Text>
                  </View>
                  <Pressable testID="close-surah-actions" onPress={closeSurahMenu} hitSlop={12} accessibilityLabel="Close surah actions">
                    <Feather name="x" size={22} color={colors.mutedForeground} />
                  </Pressable>
                </View>

                {menuMode === 'actions' && (
                  <View style={styles.menuOptions}>
                    <Pressable
                      testID={`menu-favorite-${menuSurah.id}`}
                      style={styles.menuAction}
                      onPress={() => toggleFavorite(menuSurah.id)}
                    >
                      <Feather name="heart" size={19} color={isFavorite ? colors.primary : colors.foreground} />
                      <Text style={[styles.menuActionText, { color: colors.foreground }]}>
                        {isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      </Text>
                    </Pressable>

                    <Pressable
                      testID={`menu-playlist-${menuSurah.id}`}
                      style={styles.menuAction}
                      onPress={() => { setMenuError(null); setMenuMode('playlists'); }}
                    >
                      <Feather name="list" size={19} color={colors.foreground} />
                      <Text style={[styles.menuActionText, { color: colors.foreground }]}>Add to a playlist</Text>
                    </Pressable>

                    <Pressable
                      testID={`menu-download-${menuSurah.id}`}
                      style={styles.menuAction}
                      onPress={() => { void handleDownloadAction(); }}
                    >
                      {isStartingDownload
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Feather name={selectedDownload?.status === 'complete' ? 'check-circle' : 'download'} size={19} color={colors.foreground} />}
                      <View style={styles.menuActionCopy}>
                        <Text style={[styles.menuActionText, { color: colors.foreground }]}>
                          {selectedDownload?.status === 'complete'
                            ? 'Remove offline audio'
                            : selectedDownload?.status === 'downloading'
                              ? 'Pause download'
                              : selectedDownload?.status === 'paused'
                                ? 'Resume download'
                                : 'Download offline'}
                        </Text>
                        {selectedDownload?.status === 'downloading' && (
                          <Text style={[styles.menuHint, { color: colors.mutedForeground }]}>
                            {selectedDownload.downloadedAyahs} / {menuSurah.ayahCount} ayahs
                          </Text>
                        )}
                      </View>
                    </Pressable>

                    {selectedDownload?.status === 'error' && (
                      <Text style={[styles.menuError, { color: colors.destructive }]}>
                        {selectedDownload.error ?? 'Download failed. Tap to retry.'}
                      </Text>
                    )}
                    {menuError && <Text style={[styles.menuError, { color: colors.destructive }]}>{menuError}</Text>}
                  </View>
                )}

                {menuMode === 'playlists' && (
                  <View style={styles.menuOptions}>
                    <Text style={[styles.menuSectionTitle, { color: colors.foreground }]}>Choose playlists</Text>
                    {playlists.length === 0 ? (
                      <Text style={[styles.menuHint, { color: colors.mutedForeground }]}>No playlists yet. Create one to add this surah.</Text>
                    ) : (
                      <ScrollView style={styles.playlistList} showsVerticalScrollIndicator={false}>
                        {playlists.map((playlist) => {
                          const included = playlist.surahIds.includes(menuSurah.id);
                          return (
                            <Pressable
                              key={playlist.id}
                              testID={`surah-menu-playlist-${playlist.id}`}
                              style={styles.menuAction}
                              onPress={() => toggleSurahInPlaylist(playlist.id, menuSurah.id)}
                            >
                              <Feather name={included ? 'check-circle' : 'circle'} size={19} color={included ? colors.primary : colors.mutedForeground} />
                              <Text style={[styles.menuActionText, { color: colors.foreground }]}>{playlist.name}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}
                    <Pressable testID="create-playlist-from-surah" style={styles.menuAction} onPress={() => { setMenuError(null); setMenuMode('create'); }}>
                      <Feather name="plus-circle" size={19} color={colors.primary} />
                      <Text style={[styles.menuActionText, { color: colors.primary }]}>Create a playlist</Text>
                    </Pressable>
                    <Pressable style={[styles.menuDone, { backgroundColor: colors.primary }]} onPress={() => setMenuMode('actions')}>
                      <Text style={[styles.menuDoneText, { color: colors.primaryForeground }]}>Done</Text>
                    </Pressable>
                  </View>
                )}

                {menuMode === 'create' && (
                  <View style={styles.menuOptions}>
                    <Text style={[styles.menuSectionTitle, { color: colors.foreground }]}>New playlist</Text>
                    <TextInput
                      testID="new-playlist-name"
                      value={newPlaylistName}
                      onChangeText={setNewPlaylistName}
                      placeholder="Playlist name"
                      placeholderTextColor={colors.mutedForeground}
                      returnKeyType="done"
                      onSubmitEditing={() => { void createPlaylistForSurah(); }}
                      style={[styles.playlistInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                    />
                    {menuError && <Text style={[styles.menuError, { color: colors.destructive }]}>{menuError}</Text>}
                    <Pressable
                      testID="save-new-playlist"
                      style={[styles.menuDone, { backgroundColor: colors.primary, opacity: newPlaylistName.trim() ? 1 : 0.5 }]}
                      disabled={!newPlaylistName.trim()}
                      onPress={() => { void createPlaylistForSurah(); }}
                    >
                      <Text style={[styles.menuDoneText, { color: colors.primaryForeground }]}>{t('playlist.createAndAdd')}</Text>
                    </Pressable>
                    <Pressable style={styles.menuBack} onPress={() => setMenuMode('playlists')}>
                      <Text style={[styles.menuHint, { color: colors.mutedForeground }]}>{t('playlist.backToPlaylists')}</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 34 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  greeting: { fontSize: 25, fontWeight: '600', letterSpacing: -0.6 },
  profile: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  profileText: { fontSize: 16, fontWeight: '700' },
  heroHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  sectionEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, marginBottom: 10 },
  sectionTitle: { fontSize: 28, fontWeight: '600', lineHeight: 33, letterSpacing: -0.8 },
  arabicAccent: { fontSize: 28, marginBottom: 6 },
  continueCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: 1, padding: 12, marginBottom: 16 },
  continueCopy: { flex: 1, gap: 3 },
  continueEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  continueTitle: { fontSize: 15, fontWeight: '600' },
  continueMeta: { fontSize: 11 },
  continueCta: { fontSize: 12, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statsRow: { marginBottom: 18 },
  statsTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  statsGrid: { flexDirection: 'row', gap: 10 },
  statItem: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 2 },
  featured: { borderRadius: 24, borderWidth: 1, padding: 12, flexDirection: 'row', gap: 14, marginBottom: 32 },
  featuredMain: { flex: 1, flexDirection: 'row', gap: 14 },
  featuredCloud: { alignSelf: 'flex-start', marginTop: 18 },
  featuredCopy: { flex: 1, paddingVertical: 3 },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  featuredTitle: { fontSize: 23, fontWeight: '600', marginTop: 11, letterSpacing: -0.5 },
  featuredSubtitle: { fontSize: 12, marginTop: 3 },
  featuredBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 },
  duration: { fontSize: 11 },
  circlePlay: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 19, fontWeight: '600', letterSpacing: -0.3 },
  seeAll: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 11 },
  rowActions: { width: 42, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  number: { width: 29, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 11 },
  footer: { alignItems: 'center', paddingTop: 38, paddingBottom: 12, gap: 8 },
  footerArabic: { fontSize: 22 },
  footerText: { fontSize: 11, fontStyle: 'italic', textAlign: 'center' },
  miniDock: { position: 'absolute', left: 12, right: 12 },
  menuOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  menuCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingHorizontal: 20, paddingTop: 20, gap: 14 },
  menuHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  menuHeadingCopy: { flex: 1, gap: 3 },
  menuEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.3 },
  menuTitle: { fontSize: 21, fontWeight: '600' },
  menuSubtitle: { fontSize: 12 },
  menuOptions: { gap: 5 },
  menuAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 8 },
  menuActionCopy: { flex: 1, gap: 2 },
  menuActionText: { fontSize: 15, fontWeight: '500' },
  menuHint: { fontSize: 12, lineHeight: 17 },
  menuError: { fontSize: 12, lineHeight: 17 },
  menuSectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  playlistList: { maxHeight: 220 },
  playlistInput: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  menuDone: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, marginTop: 6 },
  menuDoneText: { fontSize: 14, fontWeight: '600' },
  menuBack: { alignItems: 'center', paddingVertical: 8 },
});
