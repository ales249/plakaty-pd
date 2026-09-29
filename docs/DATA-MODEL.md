# Datový model — v0.2

Typy jsou v TypeScriptu. Implementují se jako zod schémata v `src/domain/` a odvodí se z nich TS typy.
Lokálně se fotky ukládají do `storage/` (JSON + soubory), později do DB a objektového úložiště. Tvar dat se nemění.

## Formáty

```ts
type FormatId = 'poster-3x4' | 'a4' | 'a3'; // 9:16 a 16:9 odstraněny 2026-09-28

interface Format {
  id: FormatId;
  label: string;                 // "Hlavní plakát 3:4"
  widthPx: number;               // 1080 | 1080 | 1920 | 2480 | 3508
  heightPx: number;              // 1440 | 1920 | 1080 | 3508 | 4961
  print?: { widthMm: number; heightMm: number; dpi: number };  // jen A3/A4
  status: 'ready' | 'planned';   // formáty se zapínají postupně
}
```

## Vstup od pořadatele (jediné, co pořadatel ovlivní)

```ts
interface PosterInput {
  templateId: string;            // jen ze schválených šablon
  photoId: string;               // jen ze schválené knihovny
  cityHeadline: string;          // "v Náchodě" (max. 23 znaků; z něj i název souboru)
  venue: string;                 // "Kulturní prostor AULA Náchod"
  date: string;                  // ISO "2026-06-04" → "4. června" + "středa" se dopočítá
  time: string;                  // "18:00" (HH:mm)
  description?: string;          // popis akce, max. 37 znaků/řádek, 3 řádky, 111 znaků
  partnerLogoIds?: string[];     // max. 2 loga pořadatele z knihovny (bílé siluety)
  photoFocus?: { x: number; y: number }; // výřez jen pro tento plakát (0–1), jinak výchozí z knihovny
}
```

## Knihovna fotek (jen pro čtení: `content/photos.json`)

```ts
interface PhotoRecord {
  id: string;                    // prvních 12 znaků SHA-1 obsahu → stabilní i při novém importu
  originalName: string;
  width: number; height: number; // rozměry původního souboru (po EXIF otočení)
  variant: 'cb' | 'barva';
  focalPoint: { x: number; y: number };   // 0–1, střed výřezu
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}
// v manifestu navíc `file` (název souboru v content/photos/), API ho nevrací
```

Knihovnu vytváří `scripts/import-photos.mjs`. V budoucnu ji může nahradit databáze, rozhraní `PhotoRepository` zůstane stejné.

## Loga pořadatelů (implementováno: `src/data/ports.ts`)

```ts
interface PartnerLogoRecord {
  id: string;                    // UUID
  originalName: string;
  width: number; height: number; // uložená bílá silueta (PNG, max. 1600 px)
  createdAt: string;
}
```

Lokálně jsou v `storage/logos/` a `storage/logos.json`. V budoucnu budou patřit ke konkrétní akci nebo pořadateli.

## Šablona

```ts
interface Template {
  id: string;                    // "event-classic"
  name: string;                  // "Beseda — klasická"
  version: number;               // při změně vzhledu +1, staré exporty jdou dohledat
  formats: FormatId[];
  fields: Array<keyof PosterInput>;       // která pole šablona používá
  limits: Record<string, { maxChars: number; maxLines: number; minScale: number }>;
}
```

Layout (pozice, velikosti v jednotkách `u`) je **kód** v `templates/<id>/spec.ts`, ne data v DB. Brand se tak nedá rozbít editací záznamu. Admin v budoucnu šablony zapíná a vypíná, ale nekreslí je.

## Požadavek na export

```ts
interface RenderRequest {
  input: PosterInput;
  formatId: FormatId;
  fileType: 'pdf' | 'png' | 'jpeg'; // PDF jen A4/A3; JPEG kvalita 92
  bleed?: boolean;               // PDF pro tiskárnu: spadávka 3 mm + ořezové značky + TrimBox/BleedBox
}
```

## Budoucí fáze (teď se neimplementuje)

```ts
interface Event {
  id: string;
  token: string;                 // unikátní odkaz pro pořadatele (/plakaty/a/<token>)
  prefill: Partial<PosterInput>;         // admin předvyplní: Karlovy Vary, 18. 11. 2026, 19:00
  lockedFields: Array<keyof PosterInput>; // co pořadatel už nesmí změnit
  allowedPhotoIds: string[];
  allowedTemplateIds: string[];
  status: 'draft' | 'open' | 'closed';
  expiresAt?: string;
  createdBy: string;             // admin
}
```

Pořadatel přes odkaz dostane formulář, kde `prefill` a `lockedFields` omezí `PosterInput`. Zbytek pipeline (validace → šablona → export) zůstává stejný.
