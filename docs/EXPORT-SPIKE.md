# Export HTML → PNG/JPEG — výsledek ověření (2026-09-28)

## Rozhodnutí

**Export = headless Chromium (Playwright) na serveru.** Pořídí screenshot interní stránky `/render`, která vykreslí stejnou komponentu `Poster` jako live preview.

Klientský snímek DOM (`html-to-image` / `modern-screenshot`) jsem vyřadil kvůli dvěma věcem:
- A3 @ 300 DPI má 17,4 Mpx, což přesahuje limit canvasu v iOS Safari (~16,7 Mpx),
- Safari má známé problémy s fonty a obrázky ve `foreignObject`.

## Co se ověřovalo a jak

| Test | Výsledek |
|---|---|
| Rozměr výstupu | PNG i JPEG přesně 1080 × 1440. Export navíc kontroluje velikost `[data-poster]` a při neshodě skončí chybou. |
| Font | Export ověří, že `PD Montserrat` má stav `loaded`, jinak skončí chybou. Systémový Montserrat se použít nemůže (jiný název rodiny). |
| SVG logo | Ostré. Poloha proti referenci ±1 px. |
| Fotka | Dekódování všech obrázků se čeká (`img.decode()`). Výřez se řídí ohniskem. |
| Shoda s referencí Náchod | Pásky, text nadpisu, datum/čas/den, místo i logo sedí na 0–3 px (porovnání překrytím). |
| **Chromium (export) vs WebKit (preview v Safari)** | Šířky všech pásek **identické na pixel** ve 3 testovacích plakátech. Rozdílné pixely jsou jen antialiasing a posun účaří o ≤ 1 px: 2,3–2,9 % pixelů se liší o > 8/255, 0,4–0,6 % o > 128/255. |
| Doba exportu | ~0,3 s na vykreslení, první export po startu serveru ~6 s (spuštění Chromia). |

## Nalezené a opravené chyby

1. **Indikátor dev režimu Next.js se vyfotil do exportu.** Vypnuto v `next.config.ts` (`devIndicators: false`).
2. **Tracking v `em` na kořenovém prvku** se přepočítal z 16 px, takže texty vycházely o 2–3 % širší. Opraveno: tracking se počítá v px pro každý textový prvek zvlášť.

## Rozlišení výstupu (2026-09-28)

- Formáty pro sítě se exportují **2×** (`deviceScaleFactor: 2`). U 3:4 je výsledek **2160 × 2880 px**. Rozvržení je totožné s 1× (po zmenšení se liší 0,01 % pixelů, jen antialiasing). Text a logo jsou ostřejší, Instagram si obrázek zmenší sám.
- Tiskové formáty (A4, A3) mají 300 DPI už v základu, proto 1×. Viz `exportScale()` v `src/domain/formats.ts`.
- Fotka ve 2× potřebuje zdroj aspoň ~2200 px na šířku, jinak se mírně zvětšuje.

## PDF pro tisk (2026-09-28)

- A4/A3 se dají stáhnout jako PDF přes `page.pdf()` ze stejné stránky `/render`. Plakát v px se zmenší (`scale`), aby přesně vyplnil stránku v mm.
- Ověřeno: 1 stránka, 210 × 297 mm / 297 × 420 mm (MediaBox zaokrouhlený na celé body, odchylka ≤ 0,2 mm), font Montserrat-Bold vložený jako podmnožina, jediný rastrový obrázek = fotka (původní JPEG, DCTDecode, beze změny). Logo PD, text a pásky jsou vektorové. Rastrované PDF se liší od PNG v 1,5 % pixelů (vyhlazování při rastrování).
- Velikost ~0,6 MB, doba ~0,6 s (první export daného rozměru ~0,9 s, viz níže).
- **Bílý proužek na hraně (opraveno):** Chromium ukládá rozměr stránky zaokrouhlený nahoru (A4: 595,92 × 841,92 bodu místo 595,28 × 841,89), takže plakát přesně na milimetry stránku nevyplnil a na pravém/spodním okraji zůstal ~0,25 mm bílý proužek. Řešení:
  1. `/render?w=…` vykreslí plakát rovnou ve velikosti stránky + 1 mm (šablona vše počítá z šířky),
  2. skutečný rozměr stránky se jednou změří (MediaBox zkušebního PDF, cache) a plakát se posune tak, aby se přesah ořízl rovnoměrně,
  3. pozadí stránky je černé jako pojistka.
- Nefunkční pokusy: parametr `scale` u `page.pdf` (přesah za šířkou okna se ořízne) a CSS `transform: scale` (tiskové rozvržení plakát rozbilo).
- Výsledek: všechny hrany černé / fotka až do posledního pixelu. Okraje souměrné: A4 15,5 / 15,6 mm, A3 21,8 / 22,3 mm (PNG: 22,0 / 22,0). Na samé hraně fotky vidí rastrovací prohlížeč ~1 bod jemného ztmavení. Stejné je i u kontrolní stránky bez šablony, jde o vyhlazení obrázku na hraně stránky, v tisku bez spadávky nepostřehnutelné.

## PDF pro tiskárnu: spadávka + ořezové značky (2026-09-28)

- Volitelně u PDF A4/A3 (`bleed: true`). Stránka `/render` s parametrem `sheet` obalí plakát tiskovým archem (`src/templates/print-sheet.tsx`): bílý okraj 9 mm, plakát se spadávkou 3 mm (`Poster` dostane `bleed` v u, fotka a nakloněná hrana se prodlouží), ořezové značky jako SVG (vektorově).
- Arch se vykresluje **přesně 1 : 1** a bez posunu. Přesah proti zaokrouhlení stránky, který se používá u PDF bez okraje, by plakát zvětšil o 0,44 % (první verze: ořez vycházel o 0,5–0,8 mm mimo). Nadbytek stránky z Chromia zůstane bílý na okraji archu.
- Po vykreslení se přes `@cantoo/pdf-lib` (udržovaný fork pdf-lib) zapíše **TrimBox** a **BleedBox** (`src/export/pdf-boxes.ts`), počítané od levého horního rohu.
- Ověřeno na rastru 6000 px: značky v 8,98–9,00 mm od kraje, ořez mezi značkami A4 209,9 × 297,0 mm, A3 297,0 × 420,2 mm; TrimBox 210 × 297 / 297 × 420 mm; plakát sahá do spadávky (5,9 mm od kraje, cíl 6,0).
- Soubor má příponu `-pro-tiskarnu`.

## Důsledky pro produkci

- Server musí mít Chromium: Node server nebo VPS, případně serverless s `@sparticuz/chromium`. Pro hosting na webu PD je potřeba to zohlednit.
- Preview v Safari se od exportu může lišit o ≤ 1 px. **Závazný je vždy exportovaný soubor.**
