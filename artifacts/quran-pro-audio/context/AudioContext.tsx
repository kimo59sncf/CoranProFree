import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAudioModeAsync, useAudioPlaylist, useAudioPlaylistStatus } from 'expo-audio';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_RECITER_ID, getReciter, reciters, surahAyahUrl, surahs, type Reciter, type Surah } from '@/data/quran';
import { audioDownloadManager, type DownloadRecord } from '@/services/audio/AudioDownloadManager';

type RepeatMode = 'off' | 'ayah' | 'surah' | 'range';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'completed' | 'error';

export const REPEAT_COUNT_OPTIONS: number[] = [1, 2, 3, 5, 10, 20, Infinity];

export type UserPlaylist = {
  id: string;
  name: string;
  surahIds: number[];
  createdAt: number;
};

type AudioContextValue = {
  currentSurah: Surah;
  currentAyah: number;
  reciter: Reciter;
  progress: number;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  speed: number;
  repeatMode: RepeatMode;
  repeatCount: number;
  completedRepeats: number;
  rangeStart: number;
  rangeEnd: number;
  sleepTimerMinutes: number | null;
  isDownloaded: boolean;
  audioError: string | null;
  storageError: string | null;
  playbackState: PlaybackState;
  hasActiveAudio: boolean;
  favoriteIds: number[];
  playlists: UserPlaylist[];
  downloads: DownloadRecord[];
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  retry: () => void;
  seek: (seconds: number) => void;
  seekProgress: (ratio: number) => void;
  seekAyah: (ayahId: number) => void;
  skipAyah: (direction: -1 | 1) => void;
  selectSurah: (surah: Surah) => void;
  selectSurahAt: (surah: Surah, ayahId: number) => void;
  playRandomSurah: () => void;
  nextSurah: () => void;
  previousSurah: () => void;
  setSpeed: (speed: number) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setRepeatCount: (count: number) => void;
  setRepeatRange: (start: number, end: number) => void;
  setReciter: (reciterId: string) => void;
  startHifz: (surahId: number, rangeStart: number, rangeEnd: number, speed: number, repeatCount: number, reciterId: string) => void;
  setSleepTimer: (minutes: number | null) => void;
  toggleFavorite: (surahId: number) => void;
  createPlaylist: (name: string) => Promise<UserPlaylist>;
  deletePlaylist: (playlistId: string) => void;
  toggleSurahInPlaylist: (playlistId: string, surahId: number) => void;
  playPlaylist: (playlistId: string) => void;
  downloadSurah: (surah: Surah) => Promise<DownloadRecord>;
  pauseDownload: (surahId: number) => Promise<void>;
  removeDownload: (surahId: number) => Promise<void>;
  removeAllDownloads: () => Promise<void>;
};

type Track = { surahId: number; ayahId: number; repeatIteration: number };

const AudioContext = createContext<AudioContextValue | null>(null);
const AUDIO_STATE_KEY = '@quran-pro-audio/state';
const FAVORITES_KEY = '@quran-pro-audio/favorites';
const PLAYLISTS_KEY = '@quran-pro-audio/playlists';

type PersistedAudioState = {
  surahId?: number;
  ayahId?: number;
  position?: number;
  speed?: number;
  repeatCount?: number;
  repeatMode?: RepeatMode;
  rangeStart?: number;
  rangeEnd?: number;
  reciterId?: string;
};

const normalizeRepeatMode = (mode: unknown): RepeatMode => {
  if (mode === 'off' || mode === 'ayah' || mode === 'surah' || mode === 'range') return mode;
  return 'off';
};

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [currentSurah, setCurrentSurah] = useState<Surah>(surahs[0]);
  const [speed, setSpeedState] = useState(1);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>('off');
  const [repeatCount, setRepeatCountState] = useState<number>(1);
  const [rangeStart, setRangeStartState] = useState(1);
  const [rangeEnd, setRangeEndState] = useState<number>(surahs[0].ayahCount);
  const [reciterId, setReciterIdState] = useState<string>(DEFAULT_RECITER_ID);
  const [completedRepeats, setCompletedRepeats] = useState(0);
  const [didComplete, setDidComplete] = useState(false);
  const [hasActiveAudio, setHasActiveAudio] = useState(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const tracksRef = useRef<Track[]>([]);
  const queueSurahsRef = useRef<Surah[]>([]);
  const queueReplacementInProgressRef = useRef(false);
  const continueAfterQueueRef = useRef(false);
  const playbackIntentRef = useRef(false);
  const lastAutoAdvancedIndexRef = useRef<number | null>(null);
  const playbackUrisRef = useRef<Set<string>>(new Set());
  const queueGenerationRef = useRef(0);

  const player = useAudioPlaylist({
    sources: [],
    updateInterval: 250,
    loop: 'none',
    crossOrigin: 'anonymous',
  });
  const status = useAudioPlaylistStatus(player);
  const repeatModeRef = useRef(repeatMode);
  const repeatCountRef = useRef(repeatCount);
  const speedRef = useRef(speed);
  const reciterRef = useRef<Reciter>(getReciter(reciterId) ?? reciters[0]);
  const rangeStartRef = useRef(rangeStart);
  const rangeEndRef = useRef(rangeEnd);
  const currentSurahIdRef = useRef(currentSurah.id);
  repeatModeRef.current = repeatMode;
  repeatCountRef.current = repeatCount;
  speedRef.current = speed;
  reciterRef.current = getReciter(reciterId) ?? reciters[0];
  rangeStartRef.current = rangeStart;
  rangeEndRef.current = rangeEnd;
  currentSurahIdRef.current = currentSurah.id;

  const reciter = reciterRef.current;

  const playSurahs = useCallback(
    async (items: Surah[], autoplay: boolean, continueAfterLastSurah = false) => {
      if (!items.length) return;
      const generation = ++queueGenerationRef.current;
      setAudioError(null);
      setDidComplete(false);
      const reciter = reciterRef.current;
      const nextPlaybackUris = new Set<string>();
      try {
        const records = await audioDownloadManager.list();
        const bySurah = new Map(records.map((record) => [record.surahId, record]));
        const baseTracks: Omit<Track, 'repeatIteration'>[] = [];
        const baseSources: string[] = [];

        for (let surahIndex = 0; surahIndex < items.length; surahIndex += 1) {
          const surah = items[surahIndex];
          const record = bySurah.get(surah.id);
          const localFiles =
            record && (record.reciterId ?? DEFAULT_RECITER_ID) === reciter.id
              ? record.localFiles
              : {};
          const isRange = repeatModeRef.current === 'range' && surahIndex === 0;
          const start = isRange ? Math.max(1, rangeStartRef.current) : 1;
          const end = isRange ? Math.min(surah.ayahCount, rangeEndRef.current) : surah.ayahCount;
          for (let ayahId = start; ayahId <= end; ayahId += 1) {
            const localUri = localFiles[ayahId];
            const localPlaybackUri = localUri
              ? await audioDownloadManager.getPlaybackUri(localUri)
              : null;
            if (localPlaybackUri) nextPlaybackUris.add(localUri!);
            const uri = localPlaybackUri ?? surahAyahUrl(reciter, surah.id, ayahId);
            baseTracks.push({ surahId: surah.id, ayahId });
            baseSources.push(uri);
          }
        }

        if (generation !== queueGenerationRef.current) {
          audioDownloadManager.retainPlaybackUris(playbackUrisRef.current);
          return;
        }
        const mode = repeatModeRef.current;
        const infinite = repeatCountRef.current === Infinity;
        const repetitions = infinite ? 1 : Math.max(1, repeatCountRef.current);
        const tracks: Track[] = [];
        const sources: string[] = [];
        const appendTrack = (index: number, repeatIteration: number) => {
          const track = baseTracks[index];
          const source = baseSources[index];
          if (track && source) {
            tracks.push({ ...track, repeatIteration });
            sources.push(source);
          }
        };
        if (mode === 'ayah' && infinite) {
          const activeAyah = tracksRef.current[player.currentIndex]?.ayahId ?? baseTracks[0]?.ayahId ?? 1;
          const index = baseTracks.findIndex((track) => track.ayahId === activeAyah);
          appendTrack(index >= 0 ? index : 0, 1);
          player.loop = 'all';
        } else if (mode === 'ayah') {
          baseTracks.forEach((_, index) => {
            for (let iteration = 1; iteration <= repetitions; iteration += 1) {
              appendTrack(index, iteration);
            }
          });
          player.loop = 'none';
        } else {
          const passes = mode === 'off' ? 1 : repetitions;
          for (let iteration = 1; iteration <= passes; iteration += 1) {
            baseTracks.forEach((_, index) => appendTrack(index, iteration));
          }
          player.loop = mode !== 'off' && infinite ? 'all' : 'none';
        }

        playbackIntentRef.current = autoplay;
        continueAfterQueueRef.current = continueAfterLastSurah;
        lastAutoAdvancedIndexRef.current = null;
        queueReplacementInProgressRef.current = true;
        player.pause();
        player.clear();
        tracksRef.current = tracks;
        queueSurahsRef.current = [...items];
        setCurrentSurah(items[0]);
        setHasActiveAudio(true);
        setCompletedRepeats(0);
        sources.forEach((source) => player.add(source));
        playbackUrisRef.current = nextPlaybackUris;
        audioDownloadManager.retainPlaybackUris(nextPlaybackUris);
        player.skipTo(0);
        player.playbackRate = speedRef.current;
        queueReplacementInProgressRef.current = false;
        if (autoplay) player.play();
      } catch (error) {
        queueReplacementInProgressRef.current = false;
        audioDownloadManager.retainPlaybackUris(playbackUrisRef.current);
        setAudioError(error instanceof Error ? error.message : 'Impossible de charger cette récitation.');
      }
    },
    [player],
  );

  useEffect(() => {
    let active = true;
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    }).catch((error: unknown) => {
      if (active) setAudioError(error instanceof Error ? error.message : 'La sortie audio ne peut pas être configurée.');
    });

    Promise.all([
      AsyncStorage.getItem(AUDIO_STATE_KEY),
      AsyncStorage.getItem(FAVORITES_KEY),
      AsyncStorage.getItem(PLAYLISTS_KEY),
      audioDownloadManager.list(),
    ])
      .then(async ([audioState, favoritesState, playlistsState, storedDownloads]) => {
        if (!active) return;
        const savedAudio = audioState ? JSON.parse(audioState) as PersistedAudioState : {};
        const selected = surahs.find((surah) => surah.id === savedAudio.surahId) ?? surahs[0];
        const savedReciter = getReciter(savedAudio.reciterId ?? DEFAULT_RECITER_ID) ?? reciters[0];
        const savedRangeStart = Math.max(1, Math.min(selected.ayahCount, savedAudio.rangeStart ?? 1));
        const savedRangeEnd = Math.max(savedRangeStart, Math.min(selected.ayahCount, savedAudio.rangeEnd ?? selected.ayahCount));
        const savedRepeatMode = normalizeRepeatMode(savedAudio.repeatMode);
        const favoriteList = favoritesState ? JSON.parse(favoritesState) as number[] : [];
        const playlistList = playlistsState ? JSON.parse(playlistsState) as UserPlaylist[] : [];

        setCurrentSurah(selected);
        reciterRef.current = savedReciter;
        setReciterIdState(savedReciter.id);
        setRangeStartState(savedRangeStart);
        setRangeEndState(savedRangeEnd);
        rangeStartRef.current = savedRangeStart;
        rangeEndRef.current = savedRangeEnd;
        repeatModeRef.current = savedRepeatMode;
        setRepeatModeState(savedRepeatMode);
        if (savedAudio.speed) {
          speedRef.current = savedAudio.speed;
          setSpeedState(savedAudio.speed);
        }
        if (savedAudio.repeatCount === -1) {
          repeatCountRef.current = Infinity;
        } else if (typeof savedAudio.repeatCount === 'number' && savedAudio.repeatCount > 0) {
          repeatCountRef.current = Math.min(20, savedAudio.repeatCount);
        }
        setRepeatCountState(repeatCountRef.current);
        setFavoriteIds(favoriteList.filter((id) => surahs.some((surah) => surah.id === id)));
        setPlaylists(playlistList);
        setDownloads(storedDownloads);

        await playSurahs([selected], false, true);

        // Reprise intelligente : verset + position sauvegardés.
        const targetAyah = savedAudio.ayahId ?? 1;
        const trackIndex = tracksRef.current.findIndex(
          (track) => track.surahId === selected.id && track.ayahId === targetAyah,
        );
        if (trackIndex >= 0) {
          player.skipTo(trackIndex);
          if (savedAudio.position && savedAudio.position > 0) {
            await player.seekTo(savedAudio.position);
          }
        }

        setStorageError(null);
        setStorageReady(true);
      })
      .catch((error: unknown) => {
        if (active) {
          const message = error instanceof Error ? error.message : 'Impossible de charger la bibliothèque locale.';
          setAudioError(message);
          setStorageError(message);
        }
      });

    return () => {
      active = false;
    };
  }, [playSurahs, player]);

  useEffect(() => {
    const subscription = player.addListener('trackChanged', ({ currentIndex }) => {
      if (
        !playbackIntentRef.current ||
        queueReplacementInProgressRef.current ||
        !tracksRef.current[currentIndex]
      ) {
        return;
      }

      // Keep autoplay intent across native/web playlist item boundaries.
      player.play();
    });
    return () => subscription.remove();
  }, [player]);

  useEffect(() => {
    if (!storageReady) return;
    AsyncStorage.multiSet([
      [FAVORITES_KEY, JSON.stringify(favoriteIds)],
      [PLAYLISTS_KEY, JSON.stringify(playlists)],
    ])
      .then(() => setStorageError(null))
      .catch((error: unknown) => {
        setStorageError(error instanceof Error ? error.message : 'Impossible d’enregistrer les favoris et les playlists.');
      });
  }, [favoriteIds, playlists, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    const persist = () => {
      const track = tracksRef.current[player.currentIndex];
      const state: PersistedAudioState = {
        surahId: currentSurahIdRef.current,
        ayahId: track?.ayahId ?? 1,
        position: player.currentTime,
        speed: speedRef.current,
        repeatCount: repeatCountRef.current === Infinity ? -1 : repeatCountRef.current,
        repeatMode: repeatModeRef.current,
        rangeStart: rangeStartRef.current,
        rangeEnd: rangeEndRef.current,
        reciterId: reciterRef.current.id,
      };
      AsyncStorage.setItem(AUDIO_STATE_KEY, JSON.stringify(state)).catch(() => {});
    };
    const interval = setInterval(persist, 3000);
    return () => {
      clearInterval(interval);
      persist();
    };
  }, [player, storageReady]);

  useEffect(() => {
    const track = tracksRef.current[status.currentIndex];
    if (!track || track.surahId === currentSurah.id) return;
    const nextSurah = surahs.find((item) => item.id === track.surahId);
    if (nextSurah) setCurrentSurah(nextSurah);
  }, [currentSurah.id, status.currentIndex]);

  useEffect(() => {
    if (!playbackIntentRef.current || player.playing || player.isBuffering) return;

    // The native players normally advance the playlist themselves. This catches
    // a completed ayah if a platform leaves the queue paused on its final frame.
    const activeIndex = player.currentIndex;
    const activeTrack = tracksRef.current[activeIndex];
    if (!activeTrack || lastAutoAdvancedIndexRef.current === activeIndex) return;

    const duration = player.duration || status.duration;
    const reachedEnd =
      status.didJustFinish ||
      (duration > 0 && player.currentTime >= duration - 0.35);
    if (!reachedEnd) return;

    lastAutoAdvancedIndexRef.current = activeIndex;
    const nextTrackIndex = activeIndex + 1;
    if (tracksRef.current[nextTrackIndex]) {
      player.skipTo(nextTrackIndex);
      player.play();
      return;
    }

    if (!continueAfterQueueRef.current) {
      playbackIntentRef.current = false;
      setDidComplete(true);
      return;
    }

    const currentSurahIndex = surahs.findIndex((surah) => surah.id === activeTrack.surahId);
    const nextSurah = surahs[currentSurahIndex + 1];
    if (nextSurah) {
      void playSurahs([nextSurah], true, true);
    } else {
      playbackIntentRef.current = false;
      setDidComplete(true);
    }
  }, [
    player,
    playSurahs,
    status.currentIndex,
    status.currentTime,
    status.didJustFinish,
    status.duration,
    status.isBuffering,
    status.playing,
  ]);

  useEffect(() => {
    const track = tracksRef.current[status.currentIndex];
    if (track) setCompletedRepeats(Math.max(0, track.repeatIteration - 1));
    if (status.didJustFinish && repeatMode !== 'off') setCompletedRepeats(repeatCount);
    if (repeatMode === 'off') setCompletedRepeats(0);
  }, [repeatCount, repeatMode, status.currentIndex, status.didJustFinish]);

  useEffect(() => {
    if (!sleepTimerMinutes || !status.playing) return;
    const timer = setTimeout(() => {
      playbackIntentRef.current = false;
      player.pause();
      setSleepTimerMinutes(null);
    }, sleepTimerMinutes * 60 * 1000);
    return () => clearTimeout(timer);
  }, [player, sleepTimerMinutes, status.playing]);

  useEffect(() => () => {
    audioDownloadManager.retainPlaybackUris(new Set());
  }, []);

  const toggleFavorite = useCallback((surahId: number) => {
    setFavoriteIds((ids) => ids.includes(surahId) ? ids.filter((id) => id !== surahId) : [...ids, surahId]);
  }, []);

  const createPlaylist = useCallback(async (name: string) => {
    const playlist: UserPlaylist = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      surahIds: [],
      createdAt: Date.now(),
    };
    setPlaylists((items) => [...items, playlist]);
    return playlist;
  }, []);

  const deletePlaylist = useCallback((playlistId: string) => {
    setPlaylists((items) => items.filter((item) => item.id !== playlistId));
  }, []);

  const toggleSurahInPlaylist = useCallback((playlistId: string, surahId: number) => {
    setPlaylists((items) => items.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      const includesSurah = playlist.surahIds.includes(surahId);
      return {
        ...playlist,
        surahIds: includesSurah
          ? playlist.surahIds.filter((id) => id !== surahId)
          : [...playlist.surahIds, surahId],
      };
    }));
  }, []);

  const playPlaylist = useCallback((playlistId: string) => {
    const playlist = playlists.find((item) => item.id === playlistId);
    if (!playlist) return;
    const selected = playlist.surahIds
      .map((id) => surahs.find((surah) => surah.id === id))
      .filter((surah): surah is Surah => !!surah);
    void playSurahs(selected, true, false);
  }, [playSurahs, playlists]);

  const selectSurah = useCallback((surah: Surah) => {
    rangeStartRef.current = 1;
    rangeEndRef.current = surah.ayahCount;
    setRangeStartState(1);
    setRangeEndState(surah.ayahCount);
    void playSurahs([surah], true, true);
  }, [playSurahs]);

  const playRandomSurah = useCallback(() => {
    const random = surahs[Math.floor(Math.random() * surahs.length)];
    if (random) selectSurah(random);
  }, [selectSurah]);

  const selectSurahAt = useCallback((surah: Surah, ayahId: number) => {
    rangeStartRef.current = 1;
    rangeEndRef.current = surah.ayahCount;
    setRangeStartState(1);
    setRangeEndState(surah.ayahCount);
    void playSurahs([surah], true, true).then(() => {
      const target = tracksRef.current.findIndex(
        (track) => track.surahId === surah.id && track.ayahId === ayahId,
      );
      if (target >= 0) player.skipTo(target);
    });
  }, [playSurahs, player]);

  const rebuildQueueForRepeat = useCallback(() => {
    const items = [...queueSurahsRef.current];
    if (!items.length) return;
    const activeTrack = tracksRef.current[status.currentIndex];
    const currentTime = status.currentTime;
    const shouldResume = playbackIntentRef.current;
    const continueAfterLastSurah = continueAfterQueueRef.current;
    void playSurahs(items, false, continueAfterLastSurah).then(async () => {
      if (activeTrack) {
        const target = tracksRef.current.findIndex(
          (track) => track.surahId === activeTrack.surahId && track.ayahId === activeTrack.ayahId,
        );
        if (target >= 0) {
          player.skipTo(target);
          if (currentTime > 0) await player.seekTo(currentTime);
        }
      }
      if (shouldResume) {
        playbackIntentRef.current = true;
        player.play();
      }
    });
  }, [playSurahs, player, status.currentIndex, status.currentTime]);

  const setReciter = useCallback((nextReciterId: string) => {
    const nextReciter = getReciter(nextReciterId);
    if (!nextReciter || !nextReciter.enabled) return;
    if (nextReciterId === reciterRef.current.id) return;
    reciterRef.current = nextReciter;
    setReciterIdState(nextReciterId);
    setAudioError(null);
    rebuildQueueForRepeat();
  }, [rebuildQueueForRepeat]);

  const setRepeatRange = useCallback((start: number, end: number) => {
    const clampedStart = Math.max(1, Math.min(currentSurah.ayahCount, Math.round(start)));
    const clampedEnd = Math.max(clampedStart, Math.min(currentSurah.ayahCount, Math.round(end)));
    rangeStartRef.current = clampedStart;
    rangeEndRef.current = clampedEnd;
    setRangeStartState(clampedStart);
    setRangeEndState(clampedEnd);
    setCompletedRepeats(0);
    if (repeatModeRef.current === 'range') rebuildQueueForRepeat();
  }, [currentSurah.ayahCount, rebuildQueueForRepeat]);

  const startHifz = useCallback((surahId: number, start: number, end: number, rate: number, count: number, reciterIdValue: string) => {
    const surah = surahs.find((item) => item.id === surahId);
    if (!surah) return;
    const nextReciter = getReciter(reciterIdValue);
    if (nextReciter && nextReciter.enabled) {
      reciterRef.current = nextReciter;
      setReciterIdState(reciterIdValue);
    }
    const clampedStart = Math.max(1, Math.min(surah.ayahCount, Math.round(start)));
    const clampedEnd = Math.max(clampedStart, Math.min(surah.ayahCount, Math.round(end)));
    rangeStartRef.current = clampedStart;
    rangeEndRef.current = clampedEnd;
    setRangeStartState(clampedStart);
    setRangeEndState(clampedEnd);
    repeatModeRef.current = 'range';
    setRepeatModeState('range');
    const normalized = count === Infinity ? Infinity : Math.max(1, Math.min(20, Math.round(count)));
    repeatCountRef.current = normalized;
    setRepeatCountState(normalized);
    speedRef.current = rate;
    setSpeedState(rate);
    setAudioError(null);
    void playSurahs([surah], true, true);
  }, [playSurahs]);

  const stepSurah = useCallback((direction: -1 | 1) => {
    const index = surahs.findIndex((surah) => surah.id === currentSurah.id);
    const nextIndex = (index + direction + surahs.length) % surahs.length;
    selectSurah(surahs[nextIndex]);
  }, [currentSurah.id, selectSurah]);

  const currentAyah = tracksRef.current[status.currentIndex]?.ayahId ?? 1;
  const duration = status.duration || 0;
  const progress = Math.max(0, Math.min(1, (currentAyah - 1 + (duration ? status.currentTime / duration : 0)) / currentSurah.ayahCount));
  const isDownloaded = downloads.some(
    (record) => record.surahId === currentSurah.id &&
      (record.reciterId ?? DEFAULT_RECITER_ID) === reciter.id &&
      record.status === 'complete' &&
      record.downloadedAyahs === currentSurah.ayahCount,
  );

  const playbackState: PlaybackState = (() => {
    if (audioError) return 'error';
    if (!hasActiveAudio) return 'idle';
    if (didComplete) return 'completed';
    if (status.isBuffering) return 'buffering';
    if (status.playing) return 'playing';
    return 'paused';
  })();

  const value = useMemo<AudioContextValue>(() => ({
    currentSurah,
    currentAyah,
    reciter,
    progress,
    isPlaying: status.playing,
    isBuffering: status.isBuffering,
    position: status.currentTime,
    duration,
    speed,
    repeatMode,
    repeatCount,
    completedRepeats,
    rangeStart,
    rangeEnd,
    sleepTimerMinutes,
    isDownloaded,
    audioError,
    storageError,
    playbackState,
    hasActiveAudio,
    favoriteIds,
    playlists,
    downloads,
    play: () => {
      setAudioError(null);
      setDidComplete(false);
      playbackIntentRef.current = true;
      player.play();
    },
    pause: () => {
      playbackIntentRef.current = false;
      player.pause();
    },
    togglePlayback: () => {
      if (status.playing) {
        playbackIntentRef.current = false;
        player.pause();
      }
      else {
        setAudioError(null);
        setDidComplete(false);
        playbackIntentRef.current = true;
        player.play();
      }
    },
    retry: () => {
      if (!queueSurahsRef.current.length) return;
      void playSurahs(queueSurahsRef.current, true, continueAfterQueueRef.current);
    },
    seek: (seconds) => {
      void player.seekTo(Math.max(0, Math.min(status.duration || 0, seconds)));
    },
    seekProgress: (ratio) => {
      const targetAyah = Math.min(currentSurah.ayahCount, Math.max(1, Math.floor(ratio * currentSurah.ayahCount) + 1));
      const trackIndex = tracksRef.current.findIndex((track) => track.surahId === currentSurah.id && track.ayahId === targetAyah);
      if (trackIndex >= 0) player.skipTo(trackIndex);
    },
    seekAyah: (ayahId) => {
      const trackIndex = tracksRef.current.findIndex((track) => track.surahId === currentSurah.id && track.ayahId === ayahId);
      if (trackIndex >= 0) player.skipTo(trackIndex);
    },
    skipAyah: (direction) => {
      const targetIndex = Math.max(0, Math.min(tracksRef.current.length - 1, status.currentIndex + direction));
      if (tracksRef.current[targetIndex]) player.skipTo(targetIndex);
    },
    selectSurah,
    selectSurahAt,
    playRandomSurah,
    nextSurah: () => stepSurah(1),
    previousSurah: () => stepSurah(-1),
    setSpeed: (nextSpeed) => {
      setSpeedState(nextSpeed);
      player.playbackRate = nextSpeed;
    },
    setRepeatMode: (mode) => {
      repeatModeRef.current = mode;
      setRepeatModeState(mode);
      setCompletedRepeats(0);
      setDidComplete(false);
      rebuildQueueForRepeat();
    },
    setRepeatCount: (count) => {
      const normalized = count === Infinity ? Infinity : Math.max(1, Math.min(20, Math.round(count)));
      repeatCountRef.current = normalized;
      setRepeatCountState(normalized);
      setCompletedRepeats(0);
      rebuildQueueForRepeat();
    },
    setRepeatRange,
    setReciter,
    startHifz,
    setSleepTimer: setSleepTimerMinutes,
    toggleFavorite,
    createPlaylist,
    deletePlaylist,
    toggleSurahInPlaylist,
    playPlaylist,
    downloadSurah: async (surah) => {
      setAudioError(null);
      try {
        const record = await audioDownloadManager.downloadSurah(surah, reciterRef.current, (nextRecord) => {
          setDownloads((items) => [...items.filter((item) => item.surahId !== nextRecord.surahId), nextRecord]);
        });
        setDownloads((items) => [...items.filter((item) => item.surahId !== record.surahId), record]);
        return record;
      } catch (error) {
        setAudioError(error instanceof Error ? error.message : 'Impossible de télécharger cette sourate.');
        throw error;
      }
    },
    pauseDownload: async (surahId) => {
      await audioDownloadManager.pause(surahId, reciterRef.current.id);
      setDownloads(await audioDownloadManager.list());
    },
    removeDownload: async (surahId) => {
      await audioDownloadManager.remove(surahId, reciterRef.current.id);
      setDownloads(await audioDownloadManager.list());
    },
    removeAllDownloads: async () => {
      await audioDownloadManager.removeAll();
      setDownloads(await audioDownloadManager.list());
    },
  }), [
    audioError,
    completedRepeats,
    createPlaylist,
    currentAyah,
    currentSurah,
    deletePlaylist,
    downloads,
    duration,
    favoriteIds,
    hasActiveAudio,
    isDownloaded,
    playPlaylist,
    playbackState,
    playlists,
    player,
    progress,
    rangeEnd,
    rangeStart,
    reciter,
    repeatCount,
    repeatMode,
    rebuildQueueForRepeat,
    selectSurah,
    selectSurahAt,
    setReciter,
    setRepeatRange,
    sleepTimerMinutes,
    speed,
    startHifz,
    status.currentIndex,
    status.currentTime,
    status.duration,
    status.isBuffering,
    status.playing,
    stepSurah,
    storageError,
    toggleFavorite,
    toggleSurahInPlaylist,
  ]);

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used inside AudioProvider');
  return context;
}
