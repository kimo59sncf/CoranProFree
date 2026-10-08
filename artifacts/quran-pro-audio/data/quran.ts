import part1 from '@/data/quran-part-1';
import part2 from '@/data/quran-part-2';
import part3 from '@/data/quran-part-3';
import part4 from '@/data/quran-part-4';
import part5 from '@/data/quran-part-5';
import part6 from '@/data/quran-part-6';
import part7 from '@/data/quran-part-7';
import part8 from '@/data/quran-part-8';
import part9 from '@/data/quran-part-9';
import part10 from '@/data/quran-part-10';
import part11 from '@/data/quran-part-11';
import part12 from '@/data/quran-part-12';
/**
 * Données coraniques et sources audio.
 *
 * Voir `DATA_SOURCES.md` à la racine de ce package pour les détails de source,
 * de version et de licence (texte arabe, traductions, audio).
 *
 * IMPORTANT : aucun texte coranique n'est généré ou « corrigé » par IA.
 */
import type { QuranTextSurah } from '@/data/quran-types';
import { transliterations } from '@/data/transliterations';

/**
 * Traductions du Coran disponibles (éditions).
 *
 * Architecture prête pour l'affichage verset par verset. Les textes des
 * traductions ne sont PAS embarqués ici (pour respecter les licences et éviter
 * toute fabrication) ; ils seront chargés depuis une source licenciée via le
 * service de traduction. Voir DATA_SOURCES.md.
 */
export type TranslationEdition = {
  id: string;
  name: string;
  language: 'fr' | 'en' | 'ar';
  source: string;
  license: string;
  enabled: boolean;
};

export const translationEditions: TranslationEdition[] = [
  {
    id: 'fr.hamidullah',
    name: 'Muhammad Hamidullah (Français)',
    language: 'fr',
    source: 'Tanzil / alquran.cloud',
    license: 'À confirmer avant diffusion (voir DATA_SOURCES.md)',
    enabled: false,
  },
  {
    id: 'en.sahih',
    name: 'Saheeh International (English)',
    language: 'en',
    source: 'Tanzil / alquran.cloud',
    license: '© Saheeh International — à confirmer avant diffusion',
    enabled: false,
  },
  {
    id: 'ar.muyassar',
    name: 'التفسير الميسّر (عربي)',
    language: 'ar',
    source: 'King Fahd Quran Complex',
    license: 'À confirmer avant diffusion',
    enabled: false,
  },
];

export type CoverKind = 'recitation' | 'learning';
export type Surah = QuranTextSurah & {
  transliteration: string;
  verses: number;
  duration: string;
  cover: CoverKind;
  featured?: boolean;
};

export type Reciter = {
  id: string;
  name: string;
  arabicName: string;
  language: string;
  style: string;
  initials: string;
  color: string;
  /** URL d'une image du réciteur (source licenciée) — `null` = avatar neutre. */
  image?: string | null;
  /**
   * URL template of the per-ayah MP3 source. Must contain `{surah}` and
   * `{ayah}` placeholders (already zero-padded when resolved).
   * `null` means the reciter is not wired to a real source yet.
   */
  audioSource: string | null;
  /** Whether the reciter can actually be played/streamed. */
  enabled: boolean;
};

const quranText: readonly QuranTextSurah[] = [
  ...part1,
  ...part2,
  ...part3,
  ...part4,
  ...part5,
  ...part6,
  ...part7,
  ...part8,
  ...part9,
  ...part10,
  ...part11,
  ...part12,
];

const featuredSurahIds = new Set([1, 18, 36, 55, 67, 112]);
export const surahs: Surah[] = quranText.map((surah) => ({
  ...surah,
  transliteration: transliterations[surah.id] ?? surah.name,
  verses: surah.ayahCount,
  duration: '--:--',
  cover: surah.id % 2 === 0 ? 'learning' : 'recitation',
  featured: featuredSurahIds.has(surah.id),
}));

/**
 * Récitateurs disponibles.
 *
 * Seuls les récitateurs dont la source audio est réellement configurée
 * (`audioSource` non nul + `enabled: true`) peuvent être lus. Les autres sont
 * affichés comme « bientôt disponible » afin de ne jamais prétendre qu'une
 * source audio existe alors qu'elle n'est pas câblée (voir DATA_SOURCES.md).
 */
export const DEFAULT_RECITER_ID = 'alafasy';

export const reciters: Reciter[] = [
  {
    id: 'alafasy',
    name: 'Mishary Alafasy',
    arabicName: 'مشاري راشد العفاسي',
    language: 'Arabe',
    style: 'Murattal',
    initials: 'MA',
    color: '#6E9B8A',
    audioSource: 'https://everyayah.com/data/Alafasy_128kbps/{surah}{ayah}.mp3',
    enabled: true,
  },
  {
    id: 'sudais',
    name: 'Abdul Rahman Al-Sudais',
    arabicName: 'عبد الرحمن السديس',
    language: 'Arabe',
    style: 'Tajweed',
    initials: 'AS',
    color: '#B88F5A',
    audioSource: null,
    enabled: false,
  },
  {
    id: 'minshawi',
    name: 'Mohamed Siddiq Al-Minshawi',
    arabicName: 'محمد صديق المنشاوي',
    language: 'Arabe',
    style: 'Murattal',
    initials: 'MM',
    color: '#778DA3',
    audioSource: null,
    enabled: false,
  },
];

export const getReciter = (id: string): Reciter | undefined =>
  reciters.find((reciter) => reciter.id === id);

export type Ayah = { id: number; arabic: string; translation: string };

export const getAyahs = (surahId: number): Ayah[] => {
  const surah = quranText.find((item) => item.id === surahId);
  return (surah?.ayahs ?? []).map((arabic, index) => ({
    id: index + 1,
    arabic,
    translation: '',
  }));
};

const pad = (value: number, width = 3) => String(value).padStart(width, '0');

export const surahAyahUrl = (reciter: Reciter, surahId: number, ayahId: number): string => {
  if (!reciter.audioSource) {
    throw new Error(`Le récitateur « ${reciter.name} » n'est pas encore disponible.`);
  }
  return reciter.audioSource.replace('{surah}', pad(surahId)).replace('{ayah}', pad(ayahId));
};
