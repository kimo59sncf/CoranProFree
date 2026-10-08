export type QuranTextSurah = {
  id: number;
  name: string;
  translation: string;
  arabic: string;
  ayahCount: number;
  revelation: 'Meccan' | 'Medinan';
  ayahs: readonly string[];
};
