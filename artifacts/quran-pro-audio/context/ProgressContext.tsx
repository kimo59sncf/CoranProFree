import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ProgressState, ReadingProgress } from '@/lib/types';
import { computeStreak, todayKey } from '@/lib/text';

const PROGRESS_KEY = '@coranprofree/progress';

const EMPTY_PROGRESS: ProgressState = {
  reading: null,
  listeningMs: 0,
  activeDates: [],
  versesVisited: [],
};

type ProgressContextValue = {
  reading: ReadingProgress | null;
  listeningMs: number;
  streak: number;
  activeDates: string[];
  versesRead: number;
  recordReading: (surahId: number, ayahId: number) => void;
  addListeningTime: (ms: number) => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>(EMPTY_PROGRESS);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(PROGRESS_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        const parsed = JSON.parse(stored) as Partial<ProgressState>;
        setProgress({
          reading: parsed.reading ?? null,
          listeningMs: parsed.listeningMs ?? 0,
          activeDates: Array.isArray(parsed.activeDates) ? parsed.activeDates : [],
          versesVisited: Array.isArray(parsed.versesVisited) ? parsed.versesVisited : [],
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)).catch(() => {});
  }, [progress]);

  const recordReading = useCallback((surahId: number, ayahId: number) => {
    setProgress((prev) => {
      const date = todayKey();
      const activeDates = prev.activeDates.includes(date) ? prev.activeDates : [...prev.activeDates, date];
      const key = `${surahId}:${ayahId}`;
      const versesVisited = prev.versesVisited.includes(key) ? prev.versesVisited : [...prev.versesVisited, key];
      return { ...prev, reading: { surahId, ayahId, updatedAt: Date.now() }, activeDates, versesVisited };
    });
  }, []);

  const addListeningTime = useCallback((ms: number) => {
    if (ms <= 0) return;
    setProgress((prev) => {
      const date = todayKey();
      const activeDates = prev.activeDates.includes(date) ? prev.activeDates : [...prev.activeDates, date];
      return { ...prev, listeningMs: prev.listeningMs + ms, activeDates };
    });
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      reading: progress.reading,
      listeningMs: progress.listeningMs,
      streak: computeStreak(progress.activeDates),
      activeDates: progress.activeDates,
      versesRead: progress.versesVisited.length,
      recordReading,
      addListeningTime,
    }),
    [progress, recordReading, addListeningTime],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used inside ProgressProvider');
  return context;
}
