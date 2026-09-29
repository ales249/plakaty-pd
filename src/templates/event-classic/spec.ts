// Šablona „event-classic“ — geometrie podle reference Náchod (BRAND-RULES §3–§7).
// Čistá funkce: stejné vstupy → stejný layout ve formuláři, preview i exportu.

import { chip, layout, strip, type, type FontWeight } from '@/brand/tokens';
import { formatDateCs, formatTimeCs, weekdayCs } from '@/brand/format-cs';
import { leftBearing, measureText } from '@/brand/text-metrics';
import type { Format } from '@/domain/formats';
import { DESCRIPTION_LINE_CHARS, DESCRIPTION_MAX_LINES, type PosterInput } from '@/domain/poster-input';

export const TEMPLATE_ID = 'event-classic';
export const BRAND_LINE = 'Přepište dějiny';
/** Pevná páska nad nadpisem, uživatel ji nemění (rozhodnutí 2026-09-28) */
export const KICKER_LINE = 'Historický podcast';

/** Minimální zmenšení textu, pod které šablona nejde (BRAND-RULES §8) */
const MIN_SCALE = { headline: 0.75, venue: 0.8 } as const;

/** Svislé rozestupy v u, změřené na referenci */
const GAP_BLOCK_TO_CHIPS = 146;
/** S popisem akce: nadpis → popis → datum */
const GAP_HEADLINE_TO_DESCRIPTION = 60;
const GAP_DESCRIPTION_TO_CHIPS = 52;
const DESCRIPTION_LINE_HEIGHT = 1.3;
const GAP_CHIPS_TO_VENUE = 9;
const LINE_HEIGHT = 1.2;
/**
 * Hrana fotky se naklání spolu s páskami nadpisu, takže mezera mezi „Přepište dějiny“
 * a městem je vidět po celé šířce (zkouška 2026-09-28). false = vodorovná hrana jako v Lidicích.
 */
const PHOTO_EDGE_FOLLOWS_SKEW = true;
/** Spodní okraj textového bloku: dotažnice posledního řádku lícují se spodkem loga (−4 u je optická korekce z reference) */
const TEXT_BLOCK_BOTTOM = layout.marginBottom - 4;

export type LayoutField = 'cityHeadline' | 'description' | 'venue';

export interface LayoutError {
  field: LayoutField;
  message: string;
}

export interface TextBlock {
  lines: string[];
  size: number;
  /** levý vnitřní okraj (páska) nebo odsazení (text na tmavém) v u — zarovnává první písmeno na společnou svislici */
  padLeft: number;
}

export interface EventLayout {
  width: number;
  height: number;
  /** měřítko u → px */
  s: number;
  /** výška oblasti fotky = spodní bod hrany (u) */
  photoHeight: number;
  /** hrana fotky: y na levém a pravém okraji plátna (u); při náklonu se liší */
  photoEdge: { left: number; right: number };
  /** „Přepište dějiny“ — vždy v plné velikosti */
  brandLine: TextBlock;
  /** „v [městě]!“ — jako jediný se při delším názvu zmenšuje */
  cityLine: TextBlock;
  kicker: TextBlock;
  /** popis akce: jeden TextBlock na řádek (každý řádek má vlastní optické odsazení) */
  description: TextBlock[];
  chips: string[];
  /** vodorovný vnitřní okraj pásek s datem (symetrický) */
  chipPadX: number;
  venue: TextBlock;
  errors: LayoutError[];
}

/** Krátké předložky a spojky, které nesmí zůstat na konci řádku (česká typografie) */
const NO_BREAK_AFTER = /^(a|i|k|o|s|u|v|z|ve|ke|se|ze)$/i;

/**
 * Jména, která se nesmí rozdělit na dva řádky – v jakémkoli pádě
 * (Martin Groman, Martina Gromana, s Martinem Gromanem …).
 */
const NO_BREAK_NAMES: Array<[first: RegExp, last: RegExp]> = [
  [/^Martin\p{L}*$/u, /^Groman\p{L}*\p{P}*$/u],
  [/^Michal\p{L}*$/u, /^Stehlík\p{L}*\p{P}*$/u],
];

/** Spojí jméno a příjmení z NO_BREAK_NAMES do jednoho nedělitelného slova. */
function joinNames(words: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const next = words[i + 1];
    if (next !== undefined && NO_BREAK_NAMES.some(([first, last]) => first.test(words[i]) && last.test(next))) {
      out.push(`${words[i]} ${next}`);
      i++;
    } else {
      out.push(words[i]);
    }
  }
  return out;
}

/**
 * Rozdělí text na nezalomitelné celky: krátká předložka/spojka se drží se slovem za ní
 * („v posledních“, „a v Praze“) a jména autorů se nedělí („Martina Gromana“).
 * Celek delší než řádek se nechá rozpadnout na slova.
 */
function unbreakableUnits(text: string, maxChars: number): string[] {
  const words = joinNames(text.trim().split(/\s+/).filter(Boolean));
  const units: string[] = [];
  let pending: string[] = [];
  for (const word of words) {
    pending.push(word);
    if (NO_BREAK_AFTER.test(word)) continue;
    const unit = pending.join(' ');
    if ([...unit].length <= maxChars) units.push(unit);
    else units.push(...pending);
    pending = [];
  }
  units.push(...pending);
  return units;
}

/**
 * Zalomí text po slovech tak, aby žádný řádek neměl víc než maxChars znaků
 * a krátké předložky a spojky nezůstávaly na konci řádku.
 * Slovo delší než řádek se rozdělí natvrdo.
 */
export function wrapByChars(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (let unit of unbreakableUnits(text, maxChars)) {
    while ([...unit].length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      const chars = [...unit];
      lines.push(chars.slice(0, maxChars).join(''));
      unit = chars.slice(maxChars).join('');
    }
    if (!unit) continue;
    const candidate = current ? `${current} ${unit}` : unit;
    if ([...candidate].length <= maxChars) {
      current = candidate;
    } else {
      lines.push(current);
      current = unit;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function computeLayout(input: PosterInput, format: Format): EventLayout {
  const s = format.widthPx / 1080;
  const height = format.heightPx / s;
  const errors: LayoutError[] = [];

  // Místo konání a vstupenky nesmí zasáhnout do loga
  const besideLogoMax = 1080 - 2 * layout.marginX - layout.logoSize - layout.logoClearance;

  const hBase = type.headline.size;
  const W = type.headline.weight;

  // Společná svislice textu (u od levého okraje): kde začíná první písmeno „Přepište dějiny“.
  // Všechny ostatní řádky dostanou levý okraj tak, aby jejich první písmeno začínalo tady.
  const textX = geometry.stripPadLeft(hBase) + leftBearing(BRAND_LINE, hBase, W);
  const alignedPad = (text: string, size: number, weight: FontWeight) => textX - leftBearing(text, size, weight);

  const brandLine: TextBlock = { lines: [BRAND_LINE], size: hBase, padLeft: alignedPad(BRAND_LINE, hBase, W) };
  // Řádek s městem: zmenšuje se jen on, „Přepište dějiny“ a „Historický podcast“ zůstávají
  const cityText = `${input.cityHeadline.trim()}!`;
  // Levý okraj drží svislici, text a pravý okraj se zmenšují → text + pravý okraj musí vejít do zbytku šířky
  const cityScale = Math.min(
    1,
    (1080 - 2 * layout.marginX - textX) / (measureText(cityText, hBase, W) + geometry.stripPadRight(hBase)),
  );
  if (cityScale < MIN_SCALE.headline) {
    errors.push({ field: 'cityHeadline', message: 'Název města je pro nadpis příliš dlouhý.' });
  }
  const citySize = hBase * Math.max(cityScale, MIN_SCALE.headline);
  const cityLine: TextBlock = { lines: [cityText], size: citySize, padLeft: alignedPad(cityText, citySize, W) };

  // Pevná páska nad nadpisem
  const kSize = type.kicker.size;
  const kicker: TextBlock = { lines: [KICKER_LINE], size: kSize, padLeft: alignedPad(KICKER_LINE, kSize, type.kicker.weight) };

  // Popis akce: bílý text bez pásky, max. 37 znaků na řádek, max. 3 řádky (rozhodnutí 2026-09-28).
  // Končí nad páskami s datem, tedy nad logem, proto smí zabrat celou šířku mezi okraji.
  const dSize = type.description.size;
  const dWeight = type.description.weight;
  const descriptionLines = input.description?.trim() ? wrapByChars(input.description, DESCRIPTION_LINE_CHARS) : [];
  if (descriptionLines.length > DESCRIPTION_MAX_LINES) {
    errors.push({ field: 'description', message: `Popis akce se nevejde do ${DESCRIPTION_MAX_LINES} řádků.` });
  }
  const descriptionMaxWidth = 1080 - 2 * layout.marginX - textX;
  if (descriptionLines.some((l) => measureText(l, dSize, dWeight) > descriptionMaxWidth)) {
    errors.push({ field: 'description', message: 'Řádek popisu je příliš široký (moc širokých písmen).' });
  }
  const description: TextBlock[] = descriptionLines
    .slice(0, DESCRIPTION_MAX_LINES)
    .map((line) => ({ lines: [line], size: dSize, padLeft: alignedPad(line, dSize, dWeight) }));

  // Pásky s datem: symetrický okraj odvozený z data, aby datum začínalo na svislici
  const chips = [formatDateCs(input.date), formatTimeCs(input.time), weekdayCs(input.date)];
  const chipPadX = alignedPad(chips[0], type.chip.size, type.chip.weight);

  // Místo konání: jeden řádek, případně mírně zmenšený
  const vBase = type.venue.size;
  const vWidth = measureText(input.venue.trim(), vBase, type.venue.weight);
  const vScale = Math.min(1, (besideLogoMax - textX) / vWidth);
  if (vScale < MIN_SCALE.venue) {
    errors.push({ field: 'venue', message: 'Místo konání je příliš dlouhé.' });
  }
  const vSize = vBase * Math.max(vScale, MIN_SCALE.venue);
  const venue: TextBlock = {
    lines: [input.venue.trim()],
    size: vSize,
    padLeft: alignedPad(input.venue, vSize, type.venue.weight),
  };

  // Hrana fotky leží vždy ve středu pásky s městem (BRAND-RULES §6, změněno 2026-09-28;
  // dříve uprostřed mezery mezi „Přepište dějiny“ a městem).
  // Počítá se zdola stejnými rozměry, jakými skládá blok renderer.
  const stripH = (size: number) => size * strip.heightFactor;
  let belowCityStrip = TEXT_BLOCK_BOTTOM + venue.size * LINE_HEIGHT + GAP_CHIPS_TO_VENUE + chip.height;
  belowCityStrip +=
    description.length > 0
      ? GAP_DESCRIPTION_TO_CHIPS + description.length * dSize * DESCRIPTION_LINE_HEIGHT + GAP_HEADLINE_TO_DESCRIPTION
      : GAP_BLOCK_TO_CHIPS;
  // Místo pro pásku s městem má vždy plnou výšku → hrana ve středu tohoto místa se při zmenšení
  // města nehne (černá plocha zůstává stejná).
  const photoEdgeFromBottom = belowCityStrip + stripH(brandLine.size) / 2;
  // Na levé hraně pásek (x = marginX) leží hrana ve středu pásky s městem. Při náklonu jde rovnoběžně
  // s páskami: pásky se zkosují od své levé hrany, takže sklon je tan(úhel) od x = marginX.
  const edgeAtMargin = height - photoEdgeFromBottom;
  const slope = PHOTO_EDGE_FOLLOWS_SKEW ? Math.tan((strip.skewDeg * Math.PI) / 180) : 0;
  const photoEdge = {
    left: edgeAtMargin - layout.marginX * slope,
    right: edgeAtMargin + (1080 - layout.marginX) * slope,
  };

  return {
    width: 1080,
    height,
    s,
    photoHeight: photoEdge.left,
    photoEdge,
    brandLine,
    cityLine,
    kicker,
    description,
    chips,
    chipPadX,
    venue,
    errors,
  };
}

/** Rozměry pro renderer (v u) */
export const geometry = {
  stripHeight: (size: number) => size * strip.heightFactor,
  stripPadLeft: (size: number) => size * strip.paddingLeftEm,
  stripPadRight: (size: number) => size * strip.paddingRightEm,
  stripBaselineShift: (size: number) => size * strip.baselineShiftEm,
  stripGap: strip.gap,
  stripSkewDeg: strip.skewDeg,
  chip,
  lineHeight: LINE_HEIGHT,
  gapBlockToChips: GAP_BLOCK_TO_CHIPS,
  gapHeadlineToDescription: GAP_HEADLINE_TO_DESCRIPTION,
  gapDescriptionToChips: GAP_DESCRIPTION_TO_CHIPS,
  descriptionLineHeight: DESCRIPTION_LINE_HEIGHT,
  gapChipsToVenue: GAP_CHIPS_TO_VENUE,
  textBlockBottom: TEXT_BLOCK_BOTTOM,
} as const;
