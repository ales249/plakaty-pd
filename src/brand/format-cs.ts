// Česká podoba data a času podle BRAND-RULES §4. Záměrně bez Intl,
// aby byl výstup stejný v každém prohlížeči i na serveru.

const MONTHS_GENITIVE = [
  'ledna', 'února', 'března', 'dubna', 'května', 'června',
  'července', 'srpna', 'září', 'října', 'listopadu', 'prosince',
];

const WEEKDAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];

function parseIsoDate(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/** "2026-06-04" → "4. června" */
export function formatDateCs(iso: string): string {
  const { m, d } = parseIsoDate(iso);
  return `${d}. ${MONTHS_GENITIVE[m - 1]}`;
}

/** "2026-06-04" → "čtvrtek" (výpočet v UTC, nezávislý na časové zóně) */
export function weekdayCs(iso: string): string {
  const { y, m, d } = parseIsoDate(iso);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "9:5" / "09:05" → "9:05"; "18:00" → "18:00" */
export function formatTimeCs(hhmm: string): string {
  const [h, min] = hhmm.split(':').map(Number);
  return `${h}:${String(min).padStart(2, '0')}`;
}
