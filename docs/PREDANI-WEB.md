# Předání pro nasazení na web (prepistedejiny.cz/plakaty)

Tenhle dokument je pro vývojáře, který bude generátor nasazovat. Popis aplikace a pravidla vzhledu jsou v [`README.md`](../README.md) a [`BRAND-RULES.md`](../BRAND-RULES.md).

## Co to je

Next.js 16 aplikace (React 19, TypeScript). Pořadatel akce vyplní formulář, vybere fotku ze schválené knihovny a stáhne plakát (PNG/JPEG, u A4/A3 i PDF). Výstup generuje **headless Chromium přes Playwright** na serveru: otevře interní stránku `/render` a pořídí screenshot nebo PDF.

Stav: hotové formáty 3:4, A4, A3. Ověřeno automatickým testem (`scripts/audit-api.mjs`) v dev i produkčním buildu, i pod `/plakaty` z čistého klonu z GitHubu.

## Stažení projektu

Originály fotek jsou v **Git LFS**, bez něj se stáhnou jen odkazy místo obrázků.

```bash
git lfs install
git clone <repozitář> plakaty-pd
cd plakaty-pd
git lfs ls-files        # má vypsat 11 fotek v content/photos/
du -sh content/photos   # ~140 MB; pokud jen ~2 MB, jsou tam místo fotek LFS odkazy
```

**Naklonováno bez LFS?** Soubory v `content/photos/*.jpg` pak obsahují text `version https://git-lfs…` místo obrázku a export selže („obrázek se nenačetl“). Oprava v naklonované složce:

```bash
git lfs install
git lfs pull
```

## Požadavky na server

| Co | Proč |
|---|---|
| **Node.js ≥ 20** (vyvíjeno na 24) jako trvale běžící proces | Next.js server + export. **Nestačí statický ani PHP hosting.** |
| **Chromium pro Playwright** | `npx playwright install --with-deps chromium` (na Linuxu doinstaluje i systémové knihovny, ~150 MB) |
| **RAM aspoň 2 GB** | Export A3 dekóduje fotku až 43 Mpx, Chromium zabere stovky MB |
| **Žádný trvalý disk ani databáze** | Aplikace nic neukládá: fotky jsou v repozitáři, loga pořadatelů jen v prohlížeči |
| Reverzní proxy (nginx apod.) | `client_max_body_size` ≥ 25 MB (upload loga), timeout ≥ 60 s (export), odpovědi až ~30 MB (PDF s originální fotkou) |

Vhodné: VPS, Railway, Fly.io, Render apod. Serverless (Vercel) je možný jen s úpravou exportu na `@sparticuz/chromium`, a navíc naráží na limity velikosti odpovědi.

## Build a spuštění

`NEXT_PUBLIC_BASE_PATH` a `RENDER_ORIGIN` dejte do souboru **`.env.production`** v kořeni projektu (je v `.gitignore`). Next.js ho načte **při buildu i při spuštění**. `NEXT_PUBLIC_BASE_PATH` musí platit v obou krocích, jinak aplikace vrací 404. **`PORT` musí být skutečná proměnná prostředí** (hosting ji obvykle nastavuje sám), ze souboru `.env.production` se nepoužije.

```bash
cat > .env.production <<'ENV'
NEXT_PUBLIC_BASE_PATH=/plakaty
RENDER_ORIGIN=http://127.0.0.1:3000
ENV

npm ci
npx playwright install --with-deps chromium
npm run build
PORT=3000 npm start
```

### Proměnné prostředí

| Proměnná | Kdy | Význam |
|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | **při buildu i spuštění** | Podadresa webu, např. `/plakaty`. Bez ní běží aplikace v kořeni. Font, fotky, API i export ji respektují. Když chybí při `npm start`, všechno vrací 404. |
| `RENDER_ORIGIN` | za běhu | Interní adresa aplikace, kterou si export otevírá v Chromiu (např. `http://127.0.0.1:3000`). Za proxy **nastavit**, jinak Chromium chodí na veřejnou adresu požadavku. |
| `PORT` | za běhu, **jako proměnná prostředí** (ne v `.env.production`) | Port serveru (výchozí 3100). `RENDER_ORIGIN` musí ukazovat na stejný port. |

Varianta subdoména (`plakaty.prepistedejiny.cz`): build bez `NEXT_PUBLIC_BASE_PATH`.

### Kontrola po nasazení

```bash
node scripts/audit-api.mjs https://prepistedejiny.cz/plakaty
```

Test projde validace a všechny exporty (48 kontrol). Nic na serveru nezůstane, protože se nic neukládá. Očekávaný výsledek: `VÝSLEDEK API: 48 OK, 0 chyb`.

## Data

| Co | Kde | Poznámka |
|---|---|---|
| Knihovna fotek | `content/photos/` + `content/photos.json` | **Jen pro čtení**, součást repozitáře. Pořadatel fotky jen vybírá, API nahrávání ani mazání nemá. Mění se importem `scripts/import-photos.mjs` a novým nasazením. |
| Loga pořadatelů | nikde | Neukládají se. `POST /api/logos` logo jen převede na bílou siluetu a vrátí ho, prohlížeč ho pošle s exportem. Po obnovení stránky zmizí (záměr). |
| Font, logo PD | `public/fonts/`, `public/brand/` | Montserrat (SIL OFL) |

Úložiště je za rozhraním `src/data/ports.ts` a implementace se volí jen v `src/data/index.ts`. Náhrada za databázi nebo objektové úložiště tedy nezasáhne šablony ani export.

## Co je potřeba doplnit před veřejným spuštěním

Aplikace nic neukládá, takže na serveru nejsou žádná data k ochraně ani zálohování. Zbývá:

1. **Omezení četnosti** (rate limit) na `POST /api/export` a `POST /api/logos`. Export je náročný na CPU a paměť (Chromium), převod loga zpracovává obrázek až 20 MB.
2. **Volitelně** (návrh v [`DATA-MODEL.md`](DATA-MODEL.md), sekce „Budoucí fáze“): administrace akcí, unikátní odkazy pro pořadatele, přihlášení správce.

## Kde co je

- Architektura a vrstvy: [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
- Datový model: [`docs/DATA-MODEL.md`](DATA-MODEL.md)
- Export, PDF, spadávka a známá úskalí Chromia: [`docs/EXPORT-SPIKE.md`](EXPORT-SPIKE.md)
- Pravidla vzhledu (neměnit bez schválení PD): [`BRAND-RULES.md`](../BRAND-RULES.md)
- Konvence pro práci s kódem: [`CLAUDE.md`](../CLAUDE.md)

**Šablony a brand spravuje PD.** Změny vzhledu (`src/brand/`, `src/templates/`) prosím jen po domluvě. Na nasazení, úložiště a přihlášení je volná ruka.
