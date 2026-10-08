import assert from 'node:assert';
import {
  stripArabicDiacritics,
  normalizeArabic,
  computeStreak,
} from '../artifacts/quran-pro-audio/lib/text.ts';

// --- Normalisation arabe (recherche tolérante) ---
assert.strictEqual(
  normalizeArabic('سُورَةُ ٱلْفَاتِحَةِ'),
  'سوره الفاتحه',
  'normalizeArabic doit retirer les diacritiques',
);
assert.strictEqual(normalizeArabic('  Al-Baqara  '), 'al-baqara', 'minuscule + trim');
assert.strictEqual(stripArabicDiacritics('بِسْمِ'), 'بسم', 'strip tashkeel');

// --- Streak (jours consécutifs) ---
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

assert.strictEqual(computeStreak([today, yesterday]), 2, 'aujourd’hui + hier = 2');
assert.strictEqual(computeStreak([yesterday]), 1, 'hier seulement = 1 (tolérant)');
assert.strictEqual(computeStreak([twoDaysAgo]), 0, 'série interrompue = 0');
assert.strictEqual(computeStreak([]), 0, 'vide = 0');

console.log('✓ Tous les tests du cœur sont passés');
