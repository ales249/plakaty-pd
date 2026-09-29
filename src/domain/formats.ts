// 9:16 a 16:9 byly odstraněny 2026-09-28 (zatím nepotřeba); vrátit = přidat id + záznam do FORMATS
export const FORMAT_IDS = ['poster-3x4', 'a4', 'a3'] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

export const FILE_TYPES = ['pdf', 'png', 'jpeg'] as const;
export type FileType = (typeof FILE_TYPES)[number];

export interface Format {
  id: FormatId;
  label: string;
  widthPx: number;
  heightPx: number;
  print?: { widthMm: number; heightMm: number; dpi: number };
  /** 'ready' = šablona je hotová a otestovaná; ostatní se přidávají postupně */
  status: 'ready' | 'planned';
}

export const FORMATS: Record<FormatId, Format> = {
  'poster-3x4': { id: 'poster-3x4', label: 'Hlavní plakát 3:4', widthPx: 1080, heightPx: 1440, status: 'ready' },
  // A4/A3: stejná šablona jako 3:4 (vše v jednotkách podle šířky), extra výšku dostane fotka
  a4: { id: 'a4', label: 'A4 (tisk)', widthPx: 2480, heightPx: 3508, print: { widthMm: 210, heightMm: 297, dpi: 300 }, status: 'ready' },
  a3: { id: 'a3', label: 'A3 (tisk)', widthPx: 3508, heightPx: 4961, print: { widthMm: 297, heightMm: 420, dpi: 300 }, status: 'ready' },
};

/**
 * Hustota pixelů exportu. Formáty pro sítě se vykreslují 2× (3:4 → 2160 × 2880 px):
 * šablona je vektorová, text a logo jsou ostřejší a Instagram si obrázek zmenší sám.
 * Tiskové formáty už mají 300 DPI, proto 1×.
 */
export function exportScale(format: Format): number {
  return format.print ? 1 : 2;
}

/**
 * O kolik se fotka musí zvětšit, aby pokryla oblast fotky ve výsledném souboru (object-fit: cover).
 * > 1 znamená, že zdroj má méně pixelů, než výstup potřebuje → v tisku může být měkká.
 */
export function photoUpscale(
  format: Format,
  photo: { width: number; height: number },
  photoAreaHeightU: number,
  zoom = 1,
): number {
  const scale = exportScale(format) * (format.widthPx / 1080);
  const areaW = 1080 * scale;
  const areaH = photoAreaHeightU * scale;
  return Math.max(areaW / photo.width, areaH / photo.height) * zoom;
}

/** Nejvyšší přiblížení fotky vůbec: 110 % (pořadatel smí jen mírně, rozhodnutí 2026-09-29) */
export const PHOTO_ZOOM_MAX = 1.1;
/** Kolikrát smí být fotka ve výstupu zvětšená proti svému rozlišení: tisk přísněji než sítě */
const MAX_UPSCALE = { print: 1.15, screen: 1.5 };

/**
 * Nejvyšší přiblížení, které daná fotka v daném formátu snese bez ztráty kvality:
 * zvětšení fotky proti jejímu skutečnému rozlišení nesmí překročit MAX_UPSCALE.
 * Menší fotka, která je už bez přiblížení na hraně, vrátí 1 (přiblížit nejde).
 */
export function maxPhotoZoom(format: Format, photo: { width: number; height: number }, photoAreaHeightU: number): number {
  const limit = format.print ? MAX_UPSCALE.print : MAX_UPSCALE.screen;
  const base = photoUpscale(format, photo, photoAreaHeightU);
  return Math.min(PHOTO_ZOOM_MAX, Math.max(1, limit / base));
}

/** Nabízené typy souborů: tiskové formáty i PDF (vektorový text, přesný rozměr v mm), ostatní jen obrázky. */
export function fileTypesFor(format: Format): FileType[] {
  return format.print ? ['pdf', 'png', 'jpeg'] : ['png', 'jpeg'];
}

/** PDF pro tiskárnu (volitelné u tiskových formátů): spadávka + ořezové značky na bílém archu */
export const BLEED_MM = 3;
/** značky začínají za spadávkou a jsou dlouhé 5 mm */
export const CROP_MARK_OFFSET_MM = BLEED_MM;
export const CROP_MARK_LENGTH_MM = 5;
/** bílý okraj archu od ořezu: spadávka + značky + 1 mm rezerva */
export const PRINT_SHEET_MARGIN_MM = CROP_MARK_OFFSET_MM + CROP_MARK_LENGTH_MM + 1;
