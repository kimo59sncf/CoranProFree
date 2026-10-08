import { getAyahs, surahs } from '@/data/quran';
import { normalizeArabic } from '@/lib/text';

export type SearchResult = {
  surahId: number;
  ayahId: number; // 0 = correspondance au niveau de la sourate
  surahName: string;
  surahArabic: string;
  surahTransliteration: string;
  excerpt: string;
  type: 'surah' | 'ayah';
};

type IndexEntry = {
  surahId: number;
  ayahId: number;
  type: 'surah' | 'ayah';
  haystack: string;
  excerpt: string;
};

const normalize = normalizeArabic;

let indexCache: IndexEntry[] | null = null;

function buildIndex(): IndexEntry[] {
  const entries: IndexEntry[] = [];
  for (const surah of surahs) {
    const surahHaystack = normalize(
      [surah.name, surah.transliteration, surah.arabic, surah.translation, String(surah.id)].join(' '),
    );
    entries.push({
      surahId: surah.id,
      ayahId: 0,
      type: 'surah',
      haystack: surahHaystack,
      excerpt: `${surah.arabic} · ${surah.transliteration}`,
    });
    for (const ayah of getAyahs(surah.id)) {
      entries.push({
        surahId: surah.id,
        ayahId: ayah.id,
        type: 'ayah',
        haystack: normalize(ayah.arabic),
        excerpt: ayah.arabic,
      });
    }
  }
  return entries;
}

function getIndex(): IndexEntry[] {
  if (!indexCache) indexCache = buildIndex();
  return indexCache;
}

/**
 * Recherche locale tolérante sur : nom de sourate, translittération, arabe,
 * traduction (nom) et numéro — ainsi que le texte arabe des versets.
 * L'index est pré-calculé une seule fois en mémoire (pas de re-parcours à chaque frappe).
 */
export function searchQuran(query: string, maxResults = 40): SearchResult[] {
  const normalized = normalize(query);
  if (!normalized) return [];

  const surahById = new Map(surahs.map((surah) => [surah.id, surah]));
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const entry of getIndex()) {
    if (!entry.haystack.includes(normalized)) continue;
    const key = `${entry.type}-${entry.surahId}-${entry.ayahId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const surah = surahById.get(entry.surahId);
    if (!surah) continue;
    results.push({
      surahId: entry.surahId,
      ayahId: entry.ayahId,
      surahName: surah.name,
      surahArabic: surah.arabic,
      surahTransliteration: surah.transliteration,
      excerpt: entry.excerpt,
      type: entry.type,
    });
    if (results.length >= maxResults) break;
  }

  results.sort((a, b) => {
    if (a.type === b.type) return a.surahId - b.surahId;
    return a.type === 'surah' ? -1 : 1;
  });
  return results;
}
