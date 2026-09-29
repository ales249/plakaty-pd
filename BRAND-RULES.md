# BRAND-RULES — Přepište dějiny / generátor plakátů akcí

> **Verze 0.2 (2026-09-28).** Samostatný brand manuál neexistuje. Podle rozhodnutí majitele značky
> (2026-09-27) slouží jako manuál **dodané správné vizuály** a pravidla níže jsou z nich odvozena
> a stanovena. Hodnoty jsou kalibrované pixelovým porovnáním s referencí Náchod.

## Legenda

| Stav | Význam |
|---|---|
| **PLATÍ** | Odvozeno ze správných referencí, případně rozhodnuto majitelem. Šablony se tím řídí. |
| **NÁVRH** | Pro danou situaci reference neexistuje. Rozhodl jsem podle nejbližší reference a čeká se na vizuální schválení v aplikaci. |

## Zdroje

| Zdroj | Role |
|---|---|
| `reference/correct/nachod-ig-4x5-1080x1350.jpg` | **Hlavní reference** šablony akce. Všechny rozměry jsou kalibrované na ni. |
| `reference/correct/lidice-reminder-1080x1350.png` (+ PSD) | Druhá reference akce. Z vrstev PSD jsou vytažené fonty, velikosti a tracking. |
| `Nové vizuály PD/*.psd` | Epizodní vizuály, které potvrzují font, barvy a okraje. |
| `Plakáty/rock café.psd`, `Plakáty/Bez názvu-1 (kopie).psd` | A3 plakáty (300 DPI). |

**Vyloučeno:**
- `Hnusné plakáty sbírka/` jsou negativní příklady, nic se z nich neodvozuje.
- „Divoké devadesátky“ (co-branding) a „Brazilská cesta“ jsou speciální kampaně, generátor je nepodporuje.

Jednotka **u** = px na plátně široké 1080 px. Hodnoty jsou v `src/brand/tokens.ts` a `src/templates/event-classic/spec.ts`.

## 1. Barvy — PLATÍ

| Token | Hodnota |
|---|---|
| pozadí | `#000000` |
| páska | `#FFFFFF` |
| text na pásce | `#000000` |
| text na tmavém | `#FFFFFF` |

- Paleta je čistě monochromní, bez akcentních barev a bez přechodů.
- Tmavá barva loga je sjednocená na `#000000`. Originální `#1D1D1B` by na černém pozadí vytvořil šev.

## 2. Typografie — PLATÍ

- **Montserrat** (SIL OFL), přibalený jako soubor `public/fonts/Montserrat-VF.ttf`, verze 9.000.
- V CSS se font jmenuje `PD Montserrat`, aby se nikdy nepoužil systémově nainstalovaný Montserrat v jiné verzi.
- Tracking **−0,025 em** u všech textů (Photoshop −25).
- Větná velikost písmen, žádné verzálky.

| Role | Velikost (u) | Řez | Kalibrace |
|---|---|---|---|
| nadpis (páska) | 84 | 700 | šířka textu na referenci ±1 px |
| „Historický podcast“ (páska nad nadpisem) | 44 | 700 | velikost podle Lidic (83,3 × 0,528); pevný text, rozhodnuto 2026-09-28 |
| datum / čas / den (páska) | 38 | 700 | ±1 px |
| místo konání | 38 | 700 | ±3 px |
| popis akce (bez pásky, bílá) | 34 | 700 | řádkování 1,3; rozhodnuto 2026-09-28 |

## 3. Textová páska — PLATÍ

- **Každý řádek je samostatný bílý obdélník**, uvnitř černý text. Pásky jsou zarovnané vlevo a široké jen podle textu.
- **Pásky nadpisu jsou zkosené o −3,5°** (rozhodnutí 2026-09-28, podle PSD Lidice): vodorovné hrany stoupají doprava, svislé hrany a tahy písmen zůstávají svislé (`skewY(−3,5°)`, matice PSD `[1, −0,061, 0, 1]`). Počátek je na levé hraně pásky, takže pásky začínají na okraji a text na společné svislici. Zkosení se týká jen pásek „Historický podcast“, „Přepište dějiny“ a města. Datum, popis a místo zůstávají rovně (jako v Lidicích).
- **Hrana fotky je nakloněná stejně jako pásky** (zkouška 2026-09-28) a vede středem pásky s městem, rovnoběžně s ní. Vrácení na vodorovnou hranu (jako v Lidicích): `PHOTO_EDGE_FOLLOWS_SKEW = false` v `src/templates/event-classic/spec.ts`.
- Výška pásky je 1,42 × velikost písma (nadpis 119 u). Vnitřní okraj je 0,34 em vlevo a 0,30 em vpravo. Mezera mezi páskami 11 u. Pásky jsou oproti referenci Náchod (1,28 / 0,25 / 0,20) záměrně vzdušnější (rozhodnutí 2026-09-28).
- Nad nadpisem je vždy pevná páska **„Historický podcast“**. Uživatel ji nemůže změnit ani skrýt.
- **Společná svislice textu:** první písmeno každého řádku (Historický podcast, Přepište dějiny, město, popis akce, datum, místo konání) začíná na stejné svislici. U 3:4 je to 116 px, tedy tam, kde začíná „P“ v „Přepište dějiny“. Levý okraj každé pásky a odsazení textu se dopočítává z levého bočního odsazení prvního znaku podle metrik fontu, takže zarovnání drží pro libovolný text (rozhodnutí 2026-09-28).
- Zalomení řádků je součástí šablony: řádek 1 = „Přepište dějiny“, řádek 2 = „[město v nadpisu]!“.

## 4. Datum, čas, den — PLATÍ

- Tři pásky v pořadí **datum → čas → den**. Výška 50 u, mezera 12 u. Vnitřní okraj je symetrický (≈ 35 u) a odvozený tak, aby datum začínalo na společné svislici textu.
- Mezera mezi nadpisem a páskami s datem je **146 u** (reference měla 106 u, zvětšeno 2026-09-28).
- **Popis akce** (nepovinný): bílý text bez pásky mezi nadpisem a páskami s datem, zalomený po slovech, přes celou šířku mezi okraji (končí nad logem). Mezery: nadpis → popis 60 u, popis → datum 52 u. S popisem se blok textu i hrana fotky zvednou.
- `4. června` · `18:00` · `středa`, bez roku. **Den se dopočítá z data.**
- Pod páskami je místo konání (bílý text bez pásky), odsazené 9 u.

## 5. Nadpis a město — PLATÍ

- „Přepište dějiny“ / „v Náchodě!“.
- Město se zadává rovnou ve tvaru pro nadpis (předložka + 6. pád, např. „v Náchodě“, „ve Zlíně“). Samostatné pole „Město“ a automatický návrh skloňování byly odstraněny 2026-09-28.

## 6. Fotografie — PLATÍ

- **Schválená knihovna fotek je součást projektu** (`content/photos/` + `content/photos.json`, rozhodnutí 2026-09-29): 11 fotek, ve variantě ČB i barva. **Pořadatel fotky jen vybírá**, nahrát, smazat ani změnit výřez nemůže (a API to ani neumožňuje).
- Fotky se **neupravují**: do exportu jde původní soubor bajt po bajtu. Pro rychlý náhled ve formuláři existuje zmenšenina (1600 px).
- Knihovnu mění jen správce importem: `node scripts/import-photos.mjs "<složka>"` (knihovnu nahradí; výřezy u zachovaných fotek zůstanou). Formáty JPG, PNG, WebP.
- Tři fotky mají jen 2400 px. U A4/A3 formulář upozorní, že se musí zvětšit; na sítích je to nepoznatelné.
- Fotka je přes celou šířku nahoře, pod ní plná černá. Hrana je ostrá.
- **Hrana fotky leží vždy ve středu pásky s městem** (rozhodnutí 2026-09-28; původně uprostřed mezery mezi „Přepište dějiny“ a městem). Počítá se ze středu místa pro pásku v plné výšce, takže se při zmenšení dlouhého města nehne. Když přibude popis akce, blok textu se zvedne a hrana fotky s ním. „Historický podcast“ leží na fotce a hranu neposouvá.
- Dopočítává se v `computeLayout` ze stejných rozměrů, kterými renderer skládá textový blok.
- Výchozí výřez určuje **ohnisko** (`focalPoint`) u fotky v `content/photos.json` (výchozí x 0,5 / y 0,35; fotky u cihlové zdi x 0,42). U 3:4 i A4/A3 je fotka vidět na výšku celá, rozhoduje vodorovný střed.
- **Pořadatel si může výřez posunout jen pro svůj plakát** (`photoFocus`): kliknutím do fotky, tlačítky „Vycentrovat“ a „Výchozí výřez“. Světlý rámeček ukazuje, co bude na plakátu vidět pro zvolený formát. Knihovna se tím nemění.

## 7. Logo — PLATÍ

- Symbol „pd“ v bílém kruhu, soubor `public/brand/logo-pd-dark-bg.svg` (vyčištěný od degenerovaných barevných cest).
- 3:4: vpravo dole, průměr **152 u**, **80 u od pravého i spodního okraje** (rozhodnutí 2026-09-28; reference měla 120 u zdola). Spodní hrana lícuje s posledním řádkem textového bloku.
- Uživatel logo nemůže měnit, posouvat ani skrýt.

### Loga pořadatele (rozhodnuto 2026-09-28)

- Nepovinně **1–2 loga pořadatele**, **vlevo nahoře na fotce**: 80 u od levého i horního okraje (stejný okraj jako logo PD), mezera 40 u. Každé logo se vejde do rámečku **260 × 70 u** (poměr stran zůstává).
- **Vždy bílá silueta.** Převod dělá aplikace při nahrání (`toWhiteSilhouette` v `src/data/local/partner-logo-repository.ts`):
  - logo s průhledností: tvar zbělá, části výrazně odlišné od převládající barvy (nápis v barevném tvaru, text v rámečku) se vyříznou jako otvory,
  - logo bez průhlednosti (JPG): pozadí se odhadne z okrajů a odstraní.
- Na světlé fotce mají bílá loga nižší kontrast. Pomůže výběr fotky nebo výřezu s tmavším horním rohem.

## 8. Délky textů — PLATÍ (limity lze doladit na reálných akcích)

| Pole | Chování |
|---|---|
| město v nadpisu | **max. 23 znaků včetně mezer** (bez „!“, tvrdý limit v poli). Zmenšuje se **jen řádek s městem**: písmo i páska poměrově (až na 75 %). Páska zůstává zarovnaná nahoru v místě plné výšky, takže mezera nad ní, hrana fotky ani černá plocha se nemění. „Přepište dějiny“ a „Historický podcast“ mají vždy plnou velikost. |
| místo konání | **max. 27 znaků včetně mezer** (tvrdý limit v poli), 1 řádek vedle loga; pojistka: zmenšení až na 80 % |
| popis akce | **max. 37 znaků na řádek, max. 3 řádky, celkem max. 111 znaků** (tvrdý limit v poli). Zalamuje se po slovech; jednopísmenné předložky a spojky (a, i, k, o, s, u, v, z) a ve, ke, se, ze nezůstávají na konci řádku. Jména **Martin Groman** a **Michal Stehlík** se v žádném pádě nedělí na dva řádky. Slovo delší než 37 znaků se dělí natvrdo. **Formulář nedovolí napsat nic, co by založilo 4. řádek**; vložený delší text se ořízne na posledním celém slově. Server 4 řádky odmítne. |

Šířky textů se počítají z tabulky metrik fontu (`src/brand/metrics.generated.json`). Rozhodnutí o zmenšení je proto stejné ve formuláři, preview i exportu.

## 9. Okraje a formáty

- Boční i spodní okraj **80 u**. Textový blok je ukotven 76 u nad spodní hranou (optická korekce kvůli dotažnicím).

| Formát | Export | Stav |
|---|---|---|
| **Hlavní plakát 3:4** | 2160 × 2880 px (1080 × 1440 ve 2×) | **PLATÍ** |
| **A4** (210 × 297 mm) | 2480 × 3508 px, 300 DPI | **PLATÍ** (2026-09-28) |
| **A3** (297 × 420 mm) | 3508 × 4961 px, 300 DPI | **PLATÍ** (2026-09-28) |

- **A4 a A3 používají stejnou šablonu a typografii jako 3:4.** Všechny rozměry jsou v jednotkách u podle šířky plátna (A4: 1 u = 2,296 px, A3: 1 u = 3,248 px). Textový blok je ukotvený ke spodnímu okraji, takže vyšší plátno (1 : √2) dá víc místa fotce. Porovnání: spodní část A4/A3 se po přepočtu liší od 3:4 v < 1 % pixelů (jen vyhlazování hran).
- Tiskové formáty se exportují 1× (300 DPI už v základu).
- **PDF pro tiskárnu** (volitelné, zaškrtávátko u A4/A3): tiskový arch 1 : 1 s bílým okrajem 9 mm (A4 228 × 315 mm, A3 315 × 438 mm). Plakát má **spadávku 3 mm** (fotka a černá plocha přetečou za ořez), **ořezové značky** v rozích (0,25 bodu, od 3 do 8 mm za ořezem) a v PDF zapsaný **TrimBox** (čistý formát) a **BleedBox** (+3 mm). Texty a logo zůstávají měřené od ořezu.
- **Tiskové formáty jdou stáhnout i jako PDF** (výchozí volba): stránka přesně A4/A3, text, pásky a logo PD vektorově, font Montserrat vložený, fotka vložená v původním rozlišení bez nového uložení (2026-09-28).
- Když fotka nemá dost pixelů (musí se zvětšit o víc než 15 %), formulář upozorní. Pro A3 je potřeba fotka aspoň ~3500 px na šířku.
- Stories 9:16 a 16:9 byly z nabídky odstraněny (2026-09-28, zatím nepotřeba).

## 10. Co uživatel smí a nesmí — PLATÍ (zadání)

**Smí:** zadat město ve tvaru pro nadpis, popis akce, místo konání, datum a čas. Nahrát 1–2 vlastní loga (převedou se na bílou a mají pevné místo). Vybrat fotku z knihovny, vybrat schválenou šablonu a formát.

**Nesmí:** měnit font, barvy, logo PD, pozice, pásky ani kompozici. Kromě log pořadatele nesmí přidat vlastní grafický prvek.
