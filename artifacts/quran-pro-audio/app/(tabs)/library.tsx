import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Artwork } from '@/components/Artwork';
import { MiniPlayer } from '@/components/MiniPlayer';
import { SurahDownloadButton } from '@/components/SurahDownloadButton';
import { reciters, surahs, type Surah } from '@/data/quran';
import { useAudio, type UserPlaylist } from '@/context/AudioContext';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';

type LibraryFilter = 'all' | 'favorites' | 'playlists' | 'offline';

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const {
    selectSurah,
    favoriteIds,
    toggleFavorite,
    playlists,
    createPlaylist,
    deletePlaylist,
    toggleSurahInPlaylist,
    playPlaylist,
    downloads,
    storageError,
    downloadSurah,
    pauseDownload,
    removeDownload,
    removeAllDownloads,
  } = useAudio();
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [query, setQuery] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [pendingSurah, setPendingSurah] = useState<number | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [busyDownloads, setBusyDownloads] = useState<number[]>([]);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);

  const downloadBySurah = useMemo(
    () => new Map(downloads.map((record) => [record.surahId, record])),
    [downloads],
  );
  const completedDownloads = downloads.filter((record) => record.status === 'complete');
  const storedBytes = completedDownloads.reduce((sum, record) => sum + record.bytesDownloaded, 0);
  const activePlaylist = playlists.find((playlist) => playlist.id === selectedPlaylist) ?? null;

  const visibleSurahs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let list: Surah[] = surahs;
    if (filter === 'favorites') list = list.filter((surah) => favoriteIds.includes(surah.id));
    if (filter === 'offline') {
      list = list.filter((surah) => {
        const record = downloadBySurah.get(surah.id);
        return !!record;
      });
    }
    if (filter === 'playlists') {
      list = list.filter((surah) => activePlaylist?.surahIds.includes(surah.id));
    }
    if (normalizedQuery) {
      list = list.filter((surah) =>
        `${surah.name} ${surah.translation} ${surah.arabic}`.toLowerCase().includes(normalizedQuery),
      );
    }
    return list;
  }, [activePlaylist, downloadBySurah, favoriteIds, filter, query]);

  const openPlaylistPicker = (surahId: number) => {
    setPendingSurah(surahId);
    if (!playlists.length) {
      setCreateModalVisible(true);
      return;
    }
    setPlaylistPickerVisible(true);
  };

  const saveNewPlaylist = async () => {
    const trimmed = playlistName.trim();
    if (!trimmed) return;
    const created = await createPlaylist(trimmed);
    if (pendingSurah !== null) toggleSurahInPlaylist(created.id, pendingSurah);
    setSelectedPlaylist(created.id);
    setPlaylistName('');
    setPendingSurah(null);
    setCreateModalVisible(false);
    setFilter('playlists');
  };

  const startDownload = async (surah: Surah) => {
    if (busyDownloads.includes(surah.id)) return;
    setDownloadError(null);
    setBusyDownloads((ids) => [...ids, surah.id]);
    try {
      const record = await downloadSurah(surah);
      if (record.status === 'error') {
        setDownloadError(record.error ?? `Could not download ${surah.transliteration}.`);
      }
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : `Could not download ${surah.transliteration}.`);
    } finally {
      setBusyDownloads((ids) => ids.filter((id) => id !== surah.id));
    }
  };

  const handlePauseDownload = async (surahId: number) => {
    setDownloadError(null);
    try {
      await pauseDownload(surahId);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Could not pause this download.');
    }
  };

  const handleRemoveDownload = async (surahId: number) => {
    setDownloadError(null);
    try {
      await removeDownload(surahId);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : 'Could not remove the offline audio.');
    }
  };

  const openSurah = async (surah: Surah) => {
    await Haptics.selectionAsync();
    selectSurah(surah);
    router.push('/player');
  };

  const renderSurah = ({ item }: { item: Surah }) => {
    const record = downloadBySurah.get(item.id);
    const isFavorite = favoriteIds.includes(item.id);
    const isComplete = record?.status === 'complete';
    const isStarting = busyDownloads.includes(item.id) && record?.status !== 'downloading';
    const inActivePlaylist = !!activePlaylist?.surahIds.includes(item.id);

    return (
      <View style={[styles.row, { borderBottomColor: colors.border }]}>
        <SurahDownloadButton
          surah={item}
          download={record}
          busy={isStarting}
          onPress={() => {
            if (record?.status === 'complete') void handleRemoveDownload(item.id);
            else if (record?.status === 'downloading') void handlePauseDownload(item.id);
            else void startDownload(item);
          }}
          testID={`download-surah-${item.id}`}
        />
        <Pressable onPress={() => void openSurah(item)} style={styles.rowMain}>
          <Artwork kind={item.cover} size={48} />
          <View style={styles.rowCopy}>
            <Text style={[styles.rowArabic, { color: colors.foreground }]}>{item.arabic}</Text>
            <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
              {item.transliteration}
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {language === 'en' ? item.translation : t(item.revelation === 'Meccan' ? 'surah.meccan' : 'surah.medinan')}
            </Text>
            {!!record && !isComplete && (
              <Text style={[styles.downloadState, { color: record.status === 'error' ? colors.destructive : colors.primary }]}>
                {record.status === 'downloading'
                  ? `${t('common.downloading')} ${record.downloadedAyahs}/${record.totalAyahs} · ${formatBytes(record.bytesDownloaded)}`
                  : record.status === 'paused'
                    ? `${t('common.paused')} ${record.downloadedAyahs}/${record.totalAyahs}`
                    : record.status === 'error'
                      ? `${t('common.downloadError')}${record.error ? ` · ${record.error}` : ''}`
                      : t('common.verses').replace('{n}', `${record.downloadedAyahs}/${record.totalAyahs}`)}
              </Text>
            )}
            {isComplete && <Text style={[styles.downloadState, { color: colors.primary }]}>{t('common.availableOffline')} · {formatBytes(record.bytesDownloaded)}</Text>}
          </View>
        </Pressable>
        <View style={styles.rowActions}>
          <Pressable
            accessibilityLabel={isFavorite ? t('common.removeBookmark') : t('common.bookmark')}
            testID={`favorite-surah-${item.id}`}
            onPress={() => toggleFavorite(item.id)}
            hitSlop={8}
            style={styles.action}
          >
            <Feather name={isFavorite ? 'heart' : 'heart'} size={17} color={isFavorite ? colors.favorite : colors.mutedForeground} />
          </Pressable>
          {filter === 'playlists' && activePlaylist ? (
            <Pressable
              accessibilityLabel={t('common.removeFromPlaylist')}
              testID={`remove-playlist-surah-${item.id}`}
              onPress={() => toggleSurahInPlaylist(activePlaylist.id, item.id)}
              hitSlop={8}
              style={styles.action}
            >
              <Feather name="minus-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : filter !== 'offline' ? (
            <Pressable
              accessibilityLabel={t('common.addToPlaylist')}
              testID={`add-playlist-surah-${item.id}`}
              onPress={() => openPlaylistPicker(item.id)}
              hitSlop={8}
              style={styles.action}
            >
              <Feather name={inActivePlaylist ? 'check-circle' : 'list'} size={18} color={inActivePlaylist ? colors.primary : colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };

  const renderPlaylist = (playlist: UserPlaylist) => (
    <View key={playlist.id} style={[styles.playlistCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable
        testID={`open-playlist-${playlist.id}`}
        onPress={() => {
          setSelectedPlaylist(playlist.id);
          setFilter('playlists');
        }}
        style={styles.playlistCopy}
      >
        <View style={[styles.playlistIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="list" size={17} color={colors.primary} />
        </View>
        <View style={styles.playlistText}>
          <Text style={[styles.playlistTitle, { color: colors.foreground }]} numberOfLines={1}>{playlist.name}</Text>
          <Text style={[styles.playlistMeta, { color: colors.mutedForeground }]}>{playlist.surahIds.length} surahs</Text>
        </View>
      </Pressable>
      <Pressable
        testID={`play-playlist-${playlist.id}`}
        accessibilityLabel={playlist.surahIds.length ? `Play ${playlist.name}` : `${playlist.name} is empty`}
        accessibilityState={{ disabled: playlist.surahIds.length === 0 }}
        disabled={playlist.surahIds.length === 0}
        onPress={() => playPlaylist(playlist.id)}
        style={[styles.playButton, { backgroundColor: colors.primary, opacity: playlist.surahIds.length ? 1 : 0.45 }]}
      >
        <Feather name="play" size={15} color={colors.primaryForeground} />
      </Pressable>
      <Pressable testID={`delete-playlist-${playlist.id}`} accessibilityLabel={`Delete ${playlist.name}`} onPress={() => {
        deletePlaylist(playlist.id);
        if (selectedPlaylist === playlist.id) setSelectedPlaylist(null);
      }} hitSlop={8} style={styles.action}>
        <Feather name="trash-2" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );

  const filterOptions: { id: LibraryFilter; title: string }[] = [
    { id: 'all', title: 'All surahs' },
    { id: 'favorites', title: 'Favorites' },
    { id: 'playlists', title: 'Playlists' },
    { id: 'offline', title: 'Offline' },
  ];

  const selectedPlaylistName = playlists.find((playlist) => playlist.id === selectedPlaylist)?.name;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={visibleSurahs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderSurah}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 126 }]}
        ListHeaderComponent={
          <View>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('library.title')}</Text>
            <Text style={[styles.heading, { color: colors.foreground }]}>{t('library.heading')}</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {t('library.description')}
            </Text>

            <View style={[styles.storageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.storageIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="download-cloud" size={20} color={colors.primary} />
              </View>
              <View style={styles.storageCopy}>
                <Text style={[styles.storageTitle, { color: colors.foreground }]}>{t('library.offlineAudio')}</Text>
                <Text style={[styles.storageSubtitle, { color: colors.mutedForeground }]}>
                  {t('library.saved').replace('{n}', String(completedDownloads.length)).replace('{size}', formatBytes(storedBytes))}
                </Text>
              </View>
              <Feather name="check-circle" size={18} color={completedDownloads.length ? colors.primary : colors.mutedForeground} />
            </View>
            {completedDownloads.length > 0 && (
              <Pressable onPress={() => setClearConfirmVisible(true)} style={[styles.clearAllButton, { borderColor: colors.border }]}>
                <Feather name="trash-2" size={14} color={colors.destructive} />
                <Text style={[styles.clearAllText, { color: colors.destructive }]}>{t('library.clearAll')}</Text>
              </Pressable>
            )}
            {!!downloadError && (
              <Text accessibilityRole="alert" style={[styles.downloadError, { color: colors.destructive }]}>
                {downloadError}
              </Text>
            )}
            {!!storageError && (
              <Text accessibilityRole="alert" style={[styles.downloadError, { color: colors.destructive }]}>
                {storageError}
              </Text>
            )}

            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('library.reciters')}</Text>
              <Pressable onPress={() => router.push('/reciters')}>
                <Text style={[styles.link, { color: colors.primary }]}>{t('library.manage')}</Text>
              </Pressable>
            </View>
            <View style={styles.reciters}>
              {reciters.slice(0, 2).map((reciter) => (
                <Pressable key={reciter.id} onPress={() => router.push('/reciters')} style={[styles.reciter, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.avatar, { backgroundColor: reciter.color }]}>
                    <Text style={styles.avatarText}>{reciter.initials}</Text>
                  </View>
                  <View style={styles.reciterCopy}>
                    <Text style={[styles.reciterName, { color: colors.foreground }]} numberOfLines={1}>{reciter.name}</Text>
                    <Text style={[styles.reciterMeta, { color: colors.mutedForeground }]}>{reciter.style} · {reciter.language}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('library.memorization')}</Text>
              <Pressable onPress={() => router.push('/hifz')}>
                <Text style={[styles.link, { color: colors.primary }]}>{t('library.hifzMode')}</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('library.language')}</Text>
              <Pressable onPress={() => router.push('/about')}>
                <Text style={[styles.link, { color: colors.primary }]}>{t('library.about')}</Text>
              </Pressable>
            </View>
            <View style={styles.languageRow}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const selected = lang.code === language;
                return (
                  <Pressable key={lang.code} onPress={() => setLanguage(lang.code)} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.languageChip, { backgroundColor: selected ? colors.primary : colors.secondary }]}>
                    <Text style={[styles.languageChipText, { color: selected ? colors.primaryForeground : colors.secondaryForeground }]}>{lang.native}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('library.yourCollection')}</Text>
              <Pressable onPress={() => {
                setPendingSurah(null);
                setCreateModalVisible(true);
              }}>
                <Text style={[styles.link, { color: colors.primary }]}>+ Playlist</Text>
              </Pressable>
            </View>
            <View style={styles.filters}>
              {filterOptions.map((option) => (
                <Pressable
                  key={option.id}
                  testID={`library-filter-${option.id}`}
                  onPress={() => setFilter(option.id)}
                  style={[styles.filter, { backgroundColor: filter === option.id ? colors.primary : colors.secondary }]}
                >
                  <Text style={[styles.filterText, { color: filter === option.id ? colors.primaryForeground : colors.secondaryForeground }]}>{option.title}</Text>
                </Pressable>
              ))}
            </View>

            {playlists.length > 0 && filter === 'playlists' && (
              <View style={styles.playlistList}>
                {playlists.map(renderPlaylist)}
              <Pressable testID="new-playlist" onPress={() => {
                  if (selectedPlaylist) setSelectedPlaylist(null);
                  else setCreateModalVisible(true);
                }} style={styles.playlistHint}>
                  <Feather name="plus-circle" size={15} color={colors.primary} />
                  <Text style={[styles.playlistHintText, { color: colors.primary }]}>
                    {selectedPlaylist ? 'Choose surahs from All surahs to add them' : 'Create another playlist'}
                  </Text>
                </Pressable>
              </View>
            )}

            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={17} color={colors.mutedForeground} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('common.searchSurahs')}
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground }]}
                returnKeyType="search"
              />
              {!!query && <Pressable onPress={() => setQuery('')}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>}
            </View>

            <View style={styles.listHeading}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {filter === 'favorites' ? 'Favorites' : filter === 'offline' ? 'Offline audio' : filter === 'playlists' ? selectedPlaylistName ?? 'Choose a playlist' : 'All 114 surahs'}
              </Text>
              {filter === 'all' && <Text style={[styles.count, { color: colors.mutedForeground }]}>{visibleSurahs.length} / 114</Text>}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name={filter === 'offline' ? 'wifi-off' : filter === 'favorites' ? 'heart' : 'list'} size={26} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {filter === 'favorites' ? 'No favorites yet' : filter === 'offline' ? 'No audio saved yet' : filter === 'playlists' ? 'This playlist is empty' : 'No surahs found'}
            </Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>
              {filter === 'offline'
                ? 'Tap the download icon beside a surah to save every ayah for offline listening.'
                : filter === 'favorites'
                  ? 'Tap the heart beside a surah to keep it here.'
                  : filter === 'playlists'
                    ? 'Switch to All surahs and tap the list icon to add chapters.'
                    : 'Try a different search.'}
            </Text>
            {filter === 'playlists' && playlists.length === 0 && (
              <Pressable onPress={() => setCreateModalVisible(true)} style={[styles.emptyButton, { backgroundColor: colors.primary }]}>
                <Text style={[styles.emptyButtonText, { color: colors.primaryForeground }]}>{t('menu.createPlaylist')}</Text>
              </Pressable>
            )}
          </View>
        }
      />

      <View style={[styles.miniDock, { bottom: insets.bottom + 74 }]}>
        <MiniPlayer />
      </View>

      <Modal transparent visible={createModalVisible} animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior="padding" keyboardVerticalOffset={0}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t('playlist.new')}</Text>
            <Text style={[styles.modalDescription, { color: colors.mutedForeground }]}>{t('playlist.nameHint')}</Text>
            <TextInput
              testID="playlist-name-input"
              value={playlistName}
              onChangeText={setPlaylistName}
              placeholder={t('playlist.namePlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
              autoFocus
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={() => void saveNewPlaylist()}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setCreateModalVisible(false)} style={[styles.modalButton, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable testID="create-playlist" disabled={!playlistName.trim()} onPress={() => void saveNewPlaylist()} style={[styles.modalButton, { backgroundColor: colors.primary, opacity: playlistName.trim() ? 1 : 0.5 }]}>
                <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>{t('common.create')}</Text>
              </Pressable>
            </View>
          </View>
          </KeyboardAvoidingView>
      </Modal>

      <Modal transparent visible={playlistPickerVisible} animationType="fade" onRequestClose={() => setPlaylistPickerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t('playlist.addTo')}</Text>
            <Text style={[styles.modalDescription, { color: colors.mutedForeground }]}>{surahs.find((surah) => surah.id === pendingSurah)?.transliteration}</Text>
            {playlists.map((playlist) => {
              const selected = pendingSurah !== null && playlist.surahIds.includes(pendingSurah);
              return (
                <Pressable key={playlist.id} onPress={() => {
                  if (pendingSurah !== null) toggleSurahInPlaylist(playlist.id, pendingSurah);
                  setPlaylistPickerVisible(false);
                }} style={[styles.pickerRow, { borderBottomColor: colors.border }]}>
                  <Feather name={selected ? 'check-circle' : 'list'} size={18} color={selected ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.pickerName, { color: colors.foreground }]}>{playlist.name}</Text>
                  <Text style={[styles.pickerCount, { color: colors.mutedForeground }]}>{playlist.surahIds.length}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={() => {
              setPlaylistPickerVisible(false);
              setCreateModalVisible(true);
            }} style={styles.playlistHint}>
              <Feather name="plus-circle" size={15} color={colors.primary} />
              <Text style={[styles.playlistHintText, { color: colors.primary }]}>{t('playlist.createNew')}</Text>
            </Pressable>
            <Pressable onPress={() => setPlaylistPickerVisible(false)} style={[styles.modalButton, { backgroundColor: colors.secondary, marginTop: 10 }]}>
              <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>{t('common.done')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={clearConfirmVisible} animationType="fade" onRequestClose={() => setClearConfirmVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Supprimer tous les téléchargements ?</Text>
            <Text style={[styles.modalDescription, { color: colors.mutedForeground }]}>Cette action supprimera l'audio hors ligne de cet appareil. Elle est irréversible.</Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setClearConfirmVisible(false)} style={[styles.modalButton, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable onPress={() => { setClearConfirmVisible(false); void removeAllDownloads(); }} style={[styles.modalButton, { backgroundColor: colors.destructive }]}>
                <Text style={[styles.modalButtonText, { color: colors.destructiveForeground }]}>{t('common.delete')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  heading: { fontSize: 30, fontWeight: '600', letterSpacing: -0.8 },
  description: { fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 330 },
  storageCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 13, marginTop: 22, gap: 12 },
  storageIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  storageCopy: { flex: 1, gap: 4 },
  storageTitle: { fontSize: 14, fontWeight: '600' },
  storageSubtitle: { fontSize: 11 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '600' },
  link: { fontSize: 12, fontWeight: '600' },
  count: { fontSize: 11 },
  reciters: { gap: 9 },
  reciter: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, borderWidth: 1, padding: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  reciterCopy: { flex: 1, gap: 4 },
  reciterName: { fontSize: 13, fontWeight: '600' },
  reciterMeta: { fontSize: 10 },
  filters: { flexDirection: 'row', gap: 7, marginBottom: 15 },
  filter: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4 },
  filterText: { fontSize: 10, fontWeight: '600' },
  playlistList: { gap: 8, marginBottom: 12 },
  playlistCard: { minHeight: 61, borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', padding: 8, gap: 9 },
  playlistCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  playlistIcon: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  playlistText: { flex: 1, gap: 4 },
  playlistTitle: { fontSize: 13, fontWeight: '600' },
  playlistMeta: { fontSize: 10 },
  playButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  playlistHint: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7 },
  playlistHintText: { fontSize: 11, fontWeight: '600' },
  searchBox: { minHeight: 44, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 9, marginTop: 4 },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 8 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 23, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 10, gap: 8 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowCopy: { flex: 1, gap: 4 },
  rowArabic: { fontSize: 17, textAlign: 'right', lineHeight: 24 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowSubtitle: { fontSize: 10 },
  downloadState: { fontSize: 9, lineHeight: 13 },
  downloadError: { fontSize: 12, lineHeight: 18, marginTop: 9 },
  clearAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 12, paddingVertical: 10, marginTop: 10 },
  clearAllText: { fontSize: 12, fontWeight: '600' },
  languageRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  languageChip: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  languageChipText: { fontSize: 12, fontWeight: '600' },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  action: { width: 25, height: 32, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 35, paddingHorizontal: 25, gap: 9 },
  emptyTitle: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  emptyCopy: { fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 280 },
  emptyButton: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, marginTop: 6 },
  emptyButtonText: { fontSize: 12, fontWeight: '600' },
  miniDock: { position: 'absolute', left: 12, right: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'center', padding: 24 },
  modalCard: { borderWidth: 1, borderRadius: 22, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalDescription: { fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 14 },
  nameInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 13 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 9, marginTop: 16 },
  modalButton: { minWidth: 88, alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingVertical: 11, paddingHorizontal: 14 },
  modalButtonText: { fontSize: 12, fontWeight: '600' },
  pickerRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1 },
  pickerName: { flex: 1, fontSize: 13, fontWeight: '500' },
  pickerCount: { fontSize: 11 },
});
