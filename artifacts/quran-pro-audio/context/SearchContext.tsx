import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SearchHistoryEntry } from '@/lib/types';

const HISTORY_KEY = '@coranprofree/searchHistory';
const MAX_HISTORY = 20;

type SearchContextValue = {
  history: SearchHistoryEntry[];
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(HISTORY_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        const parsed = JSON.parse(stored) as SearchHistoryEntry[];
        if (Array.isArray(parsed)) setHistory(parsed);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(() => {});
  }, [history]);

  const addToHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setHistory((items) => {
      const filtered = items.filter((item) => item.query.toLowerCase() !== trimmed.toLowerCase());
      return [{ query: trimmed, at: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
    });
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory((items) => items.filter((item) => item.query !== query));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const value = useMemo<SearchContextValue>(
    () => ({ history, addToHistory, removeFromHistory, clearHistory }),
    [history, addToHistory, removeFromHistory, clearHistory],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchHistory() {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearchHistory must be used inside SearchProvider');
  return context;
}
