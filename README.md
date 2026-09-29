# Plakáty PD — generátor vizuálů akcí Přepište dějiny

Webová aplikace: vyplníš město, místo, datum a čas, vybereš fotku a dostaneš grafiku podle brand pravidel Přepište dějiny.

**Stav:** hotové formáty **3:4** (export 2160 × 2880 px), **A4** (2480 × 3508 px, 300 DPI) a **A3** (3508 × 4961 px, 300 DPI). Všechny používají stejnou šablonu a typografii.

## První instalace (jednou)

Potřebuješ Node.js 20 nebo novější (`node -v`).

```bash
cd ~/plakaty-pd
npm install
npx playwright install chromium
```

Druhý příkaz stáhne Chromium (~150 MB), které generuje výsledné PNG/JPEG.

## Spuštění

```bash
cd ~/plakaty-pd
npm run dev
```

Pak otevři v prohlížeči **http://localhost:3100**

(Port 3100 je zvolený schválně, protože 3000 používají jiné projekty.)

## Zastavení

V terminálu, kde aplikace běží, stiskni **Ctrl + C**.

## Opětovné spuštění

Stejně jako spuštění: `cd ~/plakaty-pd && npm run dev` a otevřít http://localhost:3100.

## Jak to používat

1. **Vyber fotku** ze schválené knihovny (ČB nebo barva). Kliknutím do velkého náhledu posuneš výřez pro svůj plakát (světlý rámeček = co bude vidět), posuvníkem ji mírně přiblížíš (max. 110 %, u tisku podle rozlišení fotky), „Vycentrovat“ / „Výchozí výřez“ vrátí výchozí stav. Nahrávat ani mazat fotky nejde, knihovnu mění jen správce (viz níže).
2. Vyplň údaje o akci. „Město v nadpisu“ piš rovnou ve tvaru za „Přepište dějiny“ (např. „v Náchodě“, „ve Zlíně“). Nepovinně přidej popis akce a 1–2 loga pořadatele.
3. Vpravo je živý náhled. Vyber formát (3:4, A4, A3) a stáhni **PNG / JPEG**. U A4 a A3 je navíc **PDF**; zaškrtnutím „PDF pro tiskárnu“ dostaneš arch se spadávkou 3 mm a ořezovými značkami.

Když je text moc dlouhý, formulář ukáže chybu a stažení se zablokuje. Šablona se nikdy nerozbije.

## Kde jsou data

| Co | Kde |
|---|---|
| Knihovna fotek | `content/photos/` (originály beze změny) + `content/photos.json` (ČB/barva, výřez) — součást projektu |
| Loga pořadatelů | `storage/logos/` + `storage/logos.json` (mimo git), uložená jako bílé siluety |
| Font | `public/fonts/Montserrat-VF.ttf` (SIL OFL) |
| Logo | `public/brand/logo-pd-dark-bg.svg` |

## Změna knihovny fotek (jen správce)

```bash
node scripts/import-photos.mjs "/cesta/ke/složce s fotkami"
```

Knihovna se nahradí fotkami ze složky (originály se zkopírují beze změny). U fotek, které v knihovně už byly, zůstane nastavený výřez. Výřez se ladí ručně v `content/photos.json` (`focalPoint`: x, y v rozsahu 0–1).

## Dokumentace

| Dokument | Obsah |
|---|---|
| [BRAND-RULES.md](BRAND-RULES.md) | Pravidla značky (barvy, typografie, pásky, rozměry) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, vrstvy, cesta k produkci |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Datové typy |
| [docs/EXPORT-SPIKE.md](docs/EXPORT-SPIKE.md) | Jak je ověřena věrnost exportu |
| [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md) | Otevřené a rozhodnuté otázky |
| [docs/PREDANI-WEB.md](docs/PREDANI-WEB.md) | **Pro vývojáře:** nasazení na web, požadavky na server, co doplnit |

## Pro vývoj

```bash
npx tsc --noEmit            # typy
npm run lint                # lint
npm run build               # produkční build
node scripts/gen-metrics.mjs   # po výměně fontu přegenerovat metriky
node scripts/audit-api.mjs     # automatický test API (běžící server; po sobě uklidí)
```
