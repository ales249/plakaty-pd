@AGENTS.md

# Plakáty PD

Generátor brandových plakátů akcí Přepište dějiny. Next.js 16 + React 19 + TS + Tailwind 4 (jen UI) + Playwright (export) + sharp (fotky). Dev server: `npm run dev` → http://localhost:3100.

## Pravidla

- Zdroj pravdy pro vzhled je `BRAND-RULES.md`. Hodnoty jsou jen v `src/brand/tokens.ts` a `src/templates/<id>/spec.ts`, v rendereru nesmí být magická čísla.
- Šablona = čistá funkce `computeLayout(input, format)` + bezstavová komponenta `Poster`. Stejný kód běží v preview (`transform: scale`) i v exportu (`/render` v Chromiu).
- Rozměry v šabloně jsou v jednotkách u (plátno široké 1080), převod přes `px()`. Žádné responzivní CSS.
- Tracking se nastavuje v px pro každý textový prvek. `em` na kořeni se přepočítá z kořenové velikosti písma.
- Šířky textu počítá jen `measureText` (tabulka metrik), ne prohlížeč, aby rozhodnutí o zmenšení bylo deterministické.
- Font se v CSS jmenuje `PD Montserrat`, aby se nepoužil systémový Montserrat.
- Úložiště pouze přes porty v `src/data/ports.ts`. Implementace se volí v `src/data/index.ts`.
- Knihovna fotek je jen pro čtení (`content/photos.json`, import `scripts/import-photos.mjs`). Fotky se nikdy neupravují, do exportu jde originál. Pořadatel nesmí nahrávat ani mazat.
- `Hnusné plakáty sbírka` (na ploše) jsou negativní příklady a nikdy se z nich neodvozují pravidla.
- Nový formát: přidat layout do `spec.ts`, přepnout `status: 'ready'` ve `formats.ts`, zkalibrovat a nechat uživatele vizuálně schválit.
