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

// Portraits des récitateurs (source : assabile.com — réutilisation à confirmer
// avant diffusion). Fallback : initiales affichées si l'image est indisponible.
const portrait = (id: number) => `https://www.assabile.com/media/portraits/${id}-200.webp`;

export const reciters: Reciter[] = [
  { id: 'alafasy', name: 'Mishary Alafasy', arabicName: 'مشاري راشد العفاسي', language: 'Arabe', style: 'Murattal', initials: 'MA', color: '#6E9B8A', image: portrait(1), audioSource: 'https://everyayah.com/data/Alafasy_128kbps/{surah}{ayah}.mp3', enabled: true },
  { id: 'husary', name: 'Mahmoud Khalil Al-Husary', arabicName: 'محمود خليل الحصري', language: 'Arabe', style: 'Murattal', initials: 'MH', color: '#8A6E9B', image: portrait(27), audioSource: 'https://everyayah.com/data/Husary_128kbps/{surah}{ayah}.mp3', enabled: true },
  { id: 'minshawi', name: 'Mohamed Siddiq Al-Minshawi', arabicName: 'محمد صديق المنشاوي', language: 'Arabe', style: 'Murattal', initials: 'MM', color: '#778DA3', image: portrait(3), audioSource: 'https://everyayah.com/data/Minshawy_Murattal_128kbps/{surah}{ayah}.mp3', enabled: true },
  { id: 'abdulbasit', name: 'Abdul Basit (Murattal)', arabicName: 'عبد الباسط عبد الصمد', language: 'Arabe', style: 'Murattal', initials: 'AB', color: '#B86E6E', image: portrait(2), audioSource: 'https://everyayah.com/data/Abdul_Basit_Murattal_192kbps/{surah}{ayah}.mp3', enabled: true },
  { id: 'sudais', name: 'Abdul Rahman Al-Sudais', arabicName: 'عبد الرحمن السديس', language: 'Arabe', style: 'Tajweed', initials: 'AS', color: '#B88F5A', image: portrait(12), audioSource: 'https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps/{surah}{ayah}.mp3', enabled: true },
  { id: 'muaiqly', name: 'Maher Al-Muaiqly', arabicName: 'ماهر المعيقلي', language: 'Arabe', style: 'Murattal', initials: 'MU', color: '#5A8F6E', image: portrait(33), audioSource: 'https://everyayah.com/data/MaherAlMuaiqly128kbps/{surah}{ayah}.mp3', enabled: true },
  { id: 'shuraym', name: 'Saud Ash-Shuraim', arabicName: 'سعود الشريم', language: 'Arabe', style: 'Murattal', initials: 'SS', color: '#6E8F5A', image: portrait(11), audioSource: 'https://everyayah.com/data/Saood_ash-Shuraym_128kbps/{surah}{ayah}.mp3', enabled: true },
  { id: 'ajamy', name: 'Ahmed Al-Ajmy', arabicName: 'أحمد العجمي', language: 'Arabe', style: 'Murattal', initials: 'AA', color: '#5A6E8F', image: portrait(13), audioSource: 'https://everyayah.com/data/Ahmed_ibn_Ali_al-Ajamy_64kbps_QuranExplorer.Com/{surah}{ayah}.mp3', enabled: true },
  { id: 'basfar', name: 'Abdullah Basfar', arabicName: 'عبد الله بصفر', language: 'Arabe', style: 'Murattal', initials: 'AB', color: '#8F5A6E', image: portrait(6), audioSource: 'https://everyayah.com/data/Abdullah_Basfar_192kbps/{surah}{ayah}.mp3', enabled: true },
  { id: 'ayyoub', name: 'Muhammad Ayyoub', arabicName: 'محمد أيوب', language: 'Arabe', style: 'Murattal', initials: 'MA', color: '#5A8F8F', image: portrait(14), audioSource: 'https://everyayah.com/data/Muhammad_Ayyoub_128kbps/{surah}{ayah}.mp3', enabled: true },
  { id: 'jibreel', name: 'Muhammad Jibreel', arabicName: 'محمد جبريل', language: 'Arabe', style: 'Murattal', initials: 'MJ', color: '#8F8F5A', image: portrait(59), audioSource: 'https://everyayah.com/data/Muhammad_Jibreel_64kbps/{surah}{ayah}.mp3', enabled: true },
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
