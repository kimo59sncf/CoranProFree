/**
 * Fonctions pures, sans dépendance (testables en Node, sans React ni alias).
 */

export function stripArabicDiacritics(value: string): string {
  return value
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه');
}

export function normalizeArabic(value: string): string {
  return stripArabicDiacritics(value).toLowerCase().trim();
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function computeStreak(activeDates: string[]): number {
  const set = new Set(activeDates);
  const start = new Date();
  // Commence à aujourd'hui ; si absent, à hier (tolérant, sans culpabiliser).
  if (!set.has(todayKey())) start.setDate(start.getDate() - 1);
  let streak = 0;
  while (set.has(start.toISOString().slice(0, 10))) {
    streak += 1;
    start.setDate(start.getDate() - 1);
  }
  return streak;
}

/**
 * Formate une date selon la langue (FR/EN/AR) avec le jour complet + mois complet.
 * Ex. : fr « Jeudi 8 octobre », en « Thursday, October 8 », ar « الخميس، ٨ أكتوبر ».
 */
export function formatDate(date: Date, language: string): string {
  const locale = language === 'fr' ? 'fr-FR' : language === 'ar' ? 'ar' : 'en-US';
  const formatted = date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
