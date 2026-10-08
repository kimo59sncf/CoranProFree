import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Bookmark } from '@/lib/types';

const BOOKMARKS_KEY = '@coranprofree/bookmarks';

type BookmarksContextValue = {
  bookmarks: Bookmark[];
  isBookmarked: (surahId: number, ayahId: number) => boolean;
  toggleBookmark: (surahId: number, ayahId: number) => void;
  removeBookmark: (id: string) => void;
};

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(BOOKMARKS_KEY)
      .then((stored) => {
        if (!active || !stored) return;
        const parsed = JSON.parse(stored) as Bookmark[];
        if (Array.isArray(parsed)) setBookmarks(parsed);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks)).catch(() => {});
  }, [bookmarks]);

  const isBookmarked = useCallback(
    (surahId: number, ayahId: number) =>
      bookmarks.some((bookmark) => bookmark.surahId === surahId && bookmark.ayahId === ayahId),
    [bookmarks],
  );

  const toggleBookmark = useCallback((surahId: number, ayahId: number) => {
    setBookmarks((items) => {
      const existing = items.find((item) => item.surahId === surahId && item.ayahId === ayahId);
      if (existing) return items.filter((item) => item.id !== existing.id);
      return [
        ...items,
        { id: `${surahId}-${ayahId}-${Date.now()}`, surahId, ayahId, createdAt: Date.now() },
      ];
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((items) => items.filter((item) => item.id !== id));
  }, []);

  const value = useMemo<BookmarksContextValue>(
    () => ({ bookmarks, isBookmarked, toggleBookmark, removeBookmark }),
    [bookmarks, isBookmarked, toggleBookmark, removeBookmark],
  );

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

export function useBookmarks() {
  const context = useContext(BookmarksContext);
  if (!context) throw new Error('useBookmarks must be used inside BookmarksProvider');
  return context;
}
