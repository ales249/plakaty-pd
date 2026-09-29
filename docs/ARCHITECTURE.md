# Architektura — v0.2

> Stav: implementováno pro formát 3:4 (2026-09-28). Export ověřen, viz `EXPORT-SPIKE.md`.

## Cíle, které architektura musí splnit

1. **Teď:** běží lokálně na Macu (`npm run dev` → localhost), bez Dockeru, databáze a cloudu.
2. **Později:** půjde nasadit na `prepistedejiny.cz/plakaty` nebo `plakaty.prepistedejiny.cz` bez přepisu brand systému a šablon.
3. **Jedna šablona = jeden renderer.** Preview a export musí vycházet ze stejného kódu, aby se nemohly rozejít.
4. Pořadatel ovlivní jen data (`PosterInput`), nikdy vzhled.

## Stack

| Vrstva | Volba | Proč |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript | Jeden projekt pro UI, API routy i budoucí admin. `basePath: '/plakaty'` vyřeší nasazení pod cestou. |
| Styl aplikace (formulář, UI) | Tailwind CSS v4.2 | Jen pro UI kolem. **Šablony plakátů Tailwind nepoužívají** (viz níže). |
| Validace | zod | Jedno schéma `PosterInput` pro formulář, preview, export API a budoucí DB. |
| Export | Playwright (headless Chromium) | Ověřeno, viz `EXPORT-SPIKE.md`. |
| Zpracování obrázků | sharp | Zmenšenina fotky pro náhled (fotka sama se neupravuje), bílé siluety log pořadatelů. |

Verze závislostí byly ověřeny v npm registry při založení (Next 16.3, React 19.3, Tailwind 4.3, zod 4.6, Playwright 1.63, sharp 0.35).

## Vrstvy

```
src/
  brand/            BRAND TOKENS: čistá data, bez Reactu
    tokens.ts         barvy, font, typografie, pásky (zkosení), okraje, loga pořadatelů (jednotky u)
    format-cs.ts      "4. června", "18:00", "středa"
    text-metrics.ts   šířka textu a boční odsazení znaků z tabulky metrik (deterministické)
    metrics.generated.json   (scripts/gen-metrics.mjs)
  domain/           DATOVÝ MODEL + VALIDACE (zod)
    formats.ts        3:4, A4, A3; typy souborů, měřítko exportu, spadávka, varování na malou fotku
    poster-input.ts   PosterInput (+ limity znaků), RenderRequest
    render-url.ts     serializace vstupu pro /render (server-only)
  templates/        ŠABLONY: čisté funkce
    registry.ts
    event-classic/spec.ts     computeLayout(input, format) → layout + chyby; zalamování popisu
    event-classic/Poster.tsx  renderer v pevných px (volitelně se spadávkou)
    print-sheet.tsx           tiskový arch: bílý okraj + ořezové značky (SVG)
  data/             PORTY + lokální implementace
    ports.ts          PhotoRepository, PartnerLogoRepository
    local/photo-catalog.ts             content/photos/ – schválená knihovna jen pro čtení (originály + náhledy)
    local/partner-logo-repository.ts   storage/logos/ – bílé siluety log pořadatelů
    index.ts          jediné místo, kde se volí implementace
  export/
    render-image.ts   Playwright: /render → PNG/JPEG/PDF + kontroly (font, obrázky, rozměr)
    pdf-boxes.ts      TrimBox/BleedBox do PDF pro tiskárnu (@cantoo/pdf-lib)
  lib/paths.ts      URL assetů (basePath)
  app/
    page.tsx, generator.tsx, photo-library.tsx, partner-logos.tsx, poster-preview.tsx   UI
    render/page.tsx          interní stránka pro export (parametry d, f, w, b, sheet)
    api/photos, api/photos/[id], api/logos, api/logos/[id], api/export
public/fonts, public/brand   přibalený font a logo PD
content/                     schválená knihovna fotek (součást projektu)
storage/                     nahraná loga pořadatelů (lokálně, mimo git)
scripts/                     gen-metrics.mjs (metriky fontu), import-photos.mjs (knihovna fotek), audit-api.mjs (test API)
```

### Klíčová pravidla

- **Šablona je čistá funkce.** Nefetchuje, nemá stav, nezná úložiště. Dostane `PosterInput` + `Format` + vyřešené URL assetů a vrátí strom prvků o přesné velikosti W×H px.
- **Šablona používá pevné pixely, ne responzivní CSS.** Všechny rozměry jsou `u × scale`, kde `scale` odvozuje `spec.ts` pro každý formát. Nic v šabloně nezávisí na šířce okna prohlížeče.
- **Preview** = stejná komponenta vykreslená 1:1 a zmenšená přes `transform: scale()` do rámečku. Layout se tedy počítá vždy v plné velikosti. Mobilní preview je jen jiné `scale`.
- **Assety přes porty.** Šablona dostane `photoUrl`, ne cestu k souboru. Lokálně vede na `/api/photos/…` (soubory ve `storage/`), v produkci na URL z úložiště. Šablony ani brand se při přechodu nemění.
- **Font je přibalený** (`public/fonts/Montserrat-VF.ttf`, žádné Google Fonts CDN). Export čeká na `document.fonts.ready` a ověří, že je načtený.

## Export

Export běží přes Playwright: server otevře `/render?d=<vstup>&f=<formát>` v headless Chromiu, počká na font a obrázky, ověří rozměr a pořídí screenshot. Výsledky ověření a důvody volby jsou v [`EXPORT-SPIKE.md`](EXPORT-SPIKE.md).

## Budoucí rozšíření bez přepisu

| Budoucí potřeba | Kam se to napojí | Co se nemění |
|---|---|---|
| Knihovna fotek, administrace | nová implementace `PhotoRepository` (DB + úložiště) + admin UI | šablony, brand |
| Úprava brand assetů | assety za portem, tokeny verzované | renderer |
| Akce + unikátní odkaz pro pořadatele | `EventRepository`: `Event` předvyplní a zamkne pole `PosterInput` a omezí fotky/šablony | šablony, validace |
| Autentizace adminů | middleware (`proxy.ts`) nad `/admin` | vše ostatní |
| Nasazení pod `/plakaty` | `basePath` v `next.config` | vše |
| Generování na serveru | export API `/api/render` (už v návrhu B) | šablony |

Model `Event` je v `DATA-MODEL.md` popsaný už teď. Implementuje se až v pozdější fázi.
