import { z } from 'zod';
import { FILE_TYPES, FORMAT_IDS, PHOTO_ZOOM_MAX } from './formats';

/** Max. délka města v nadpisu včetně mezer, bez „!“ (BRAND-RULES §8) */
export const CITY_HEADLINE_MAX_CHARS = 23;
/** Popis akce: max. znaků na řádek a řádků (BRAND-RULES §8) */
export const DESCRIPTION_LINE_CHARS = 37;
export const DESCRIPTION_MAX_LINES = 3;
export const DESCRIPTION_MAX_CHARS = DESCRIPTION_LINE_CHARS * DESCRIPTION_MAX_LINES;
/** Max. počet log pořadatele na plakátu */
export const PARTNER_LOGOS_MAX = 2;
/** Max. délka místa konání včetně mezer (BRAND-RULES §8) */
export const VENUE_MAX_CHARS = 27;

/** „2026-02-30“ → false: datum musí v kalendáři existovat */
function isRealDate(iso: string): boolean {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Jediná data, která pořadatel ovlivní (BRAND-RULES §10). */
export const posterInputSchema = z.object({
  templateId: z.string().min(1),
  photoId: z.string().min(1, 'Vyberte fotografii'),
  /** Tvar pro nadpis, např. „v Náchodě“ (BRAND-RULES §5) */
  cityHeadline: z
    .string()
    .trim()
    .min(1, 'Vyplňte město ve tvaru pro nadpis')
    .max(CITY_HEADLINE_MAX_CHARS, `Město v nadpisu může mít max. ${CITY_HEADLINE_MAX_CHARS} znaků`),
  venue: z.string().trim().min(1, 'Vyplňte místo konání').max(VENUE_MAX_CHARS, `Místo konání může mít max. ${VENUE_MAX_CHARS} znaků`),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Vyplňte datum')
    .refine(isRealDate, 'Neplatné datum'),
  time: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/, 'Vyplňte čas')
    .refine((t) => {
      const [h, m] = t.split(':').map(Number);
      return h <= 23 && m <= 59;
    }, 'Neplatný čas'),
  /** Popis akce mezi nadpisem a datem (nepovinný) */
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX_CHARS, `Popis akce může mít max. ${DESCRIPTION_MAX_CHARS} znaků`)
    .optional(),
  /**
   * Výřez fotky jen pro tento plakát (0–1). Bez něj platí výřez z knihovny.
   * Knihovnu nemění – pořadatel si jen posune, kterou část fotky plakát ukáže.
   */
  photoFocus: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).optional(),
  /** Přiblížení fotky jen pro tento plakát (1 = bez přiblížení); strop podle kvality viz maxPhotoZoom */
  photoZoom: z.number().min(1).max(PHOTO_ZOOM_MAX).optional(),
});

export type PosterInput = z.infer<typeof posterInputSchema>;

export const renderRequestSchema = z.object({
  input: posterInputSchema,
  formatId: z.enum(FORMAT_IDS),
  fileType: z.enum(FILE_TYPES),
  /** spadávka 3 mm (jen PDF tiskových formátů) */
  bleed: z.boolean().optional(),
  /**
   * Loga pořadatele jako bílé siluety (PNG data URL z /api/logos). Neukládají se,
   * posílá je prohlížeč s každým exportem.
   */
  partnerLogos: z
    .array(z.string().max(4_000_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, 'Neplatné logo'))
    .max(PARTNER_LOGOS_MAX)
    .optional(),
});

export type RenderRequest = z.infer<typeof renderRequestSchema>;
