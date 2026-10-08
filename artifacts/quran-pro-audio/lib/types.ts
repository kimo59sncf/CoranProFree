/**
 * Modèle de données de l'expérience utilisateur (favoris, progression, recherche).
 *
 * Toutes ces données sont locales (AsyncStorage) et privées — aucune
 * synchronisation automatique vers un serveur. Privacy first.
 */

export type Bookmark = {
  id: string;
  surahId: number;
  ayahId: number;
  createdAt: number;
  note?: string;
};

export type ReadingProgress = {
  surahId: number;
  ayahId: number;
  updatedAt: number;
};

export type SearchHistoryEntry = {
  query: string;
  at: number;
};

export type ProgressState = {
  reading: ReadingProgress | null;
  listeningMs: number;
  activeDates: string[];
  versesVisited: string[];
};
