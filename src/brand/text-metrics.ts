import metrics from './metrics.generated.json';
import { font, type FontWeight } from './tokens';

type Table = Record<string, number>;
const tables = metrics.weights as unknown as Record<string, Table>;
const bearings = metrics.leftBearings as unknown as Record<string, Table>;

/** Neznámý znak se počítá širší, aby odhad nikdy nepodhodnotil skutečnou šířku. */
const FALLBACK_ADVANCE = 750;

/**
 * Šířka textu v px bez kerningu (kerning Montserratu text zužuje,
 * takže odhad je mírně konzervativní). Zahrnuje tracking brandu.
 */
export function measureText(text: string, size: number, weight: FontWeight): number {
  const table = tables[String(weight)];
  const chars = [...text];
  let units = 0;
  for (const ch of chars) units += table[ch] ?? FALLBACK_ADVANCE;
  const tracking = font.trackingEm * 1000 * Math.max(0, chars.length - 1);
  return ((units + tracking) / metrics.unitsPerEm) * size;
}

/** Levé boční odsazení prvního znaku v px: o kolik je první písmeno odsazené od začátku textu. */
export function leftBearing(text: string, size: number, weight: FontWeight): number {
  const first = [...text.trim()][0];
  if (!first) return 0;
  return ((bearings[String(weight)][first] ?? 0) / metrics.unitsPerEm) * size;
}
