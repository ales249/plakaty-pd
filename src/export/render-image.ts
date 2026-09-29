import 'server-only';
import { chromium, type Browser, type Page } from 'playwright';
import type { FileType } from '@/domain/formats';

// Export = screenshot interní stránky /render v headless Chromiu.
// Stejný HTML/CSS a stejné soubory fontů jako live preview (viz docs/EXPORT-SPIKE.md).

const holder = globalThis as unknown as { __pdBrowser?: Promise<Browser> };

async function getBrowser(): Promise<Browser> {
  if (holder.__pdBrowser) {
    const browser = await holder.__pdBrowser;
    if (browser.isConnected()) return browser;
  }
  holder.__pdBrowser = chromium.launch();
  holder.__pdBrowser.catch(() => {
    holder.__pdBrowser = undefined;
  });
  return holder.__pdBrowser;
}

export interface RenderImageOptions {
  url: string;
  width: number;
  height: number;
  fileType: FileType;
  /** hustota pixelů: 2 = výstup ve dvojnásobném rozlišení (ostřejší text a logo) */
  scale: number;
  /** rozměr stránky pro PDF (jen tiskové formáty) */
  printSizeMm?: PrintSizeMm;
  /** loga pořadatele (PNG), podstrčí se na adresách partnerLogoRenderUrl(i) */
  partnerLogos?: Buffer[];
}

/** CSS px na mm (96 DPI), podle toho Chromium měří stránku PDF */
const CSS_PX_PER_MM = 96 / 25.4;
/**
 * O kolik mm plakát v PDF přesahuje stránku. Chromium ukládá rozměr stránky v 1/300 palce
 * zaokrouhlený nahoru (A4: 595,92 bodu místo 595,28), bez přesahu by na pravém a spodním
 * okraji zůstal tenký proužek.
 */
const PDF_OVERSCAN_MM = 1;

type PrintSizeMm = { width: number; height: number };

function pdfOptions(size: PrintSizeMm) {
  return {
    width: `${size.width}mm`,
    height: `${size.height}mm`,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    printBackground: true,
    pageRanges: '1',
  };
}

/** Skutečný rozměr stránky, který Chromium pro daný požadavek vytvoří (MediaBox), v mm. */
const pageSizeCache = new Map<string, PrintSizeMm>();
async function actualPdfPageMm(page: Page, size: PrintSizeMm): Promise<PrintSizeMm> {
  const key = `${size.width}x${size.height}`;
  const cached = pageSizeCache.get(key);
  if (cached) return cached;
  const probe = (await page.pdf(pdfOptions(size))).toString('latin1');
  const box = /\/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/.exec(probe);
  const measured = box ? { width: (Number(box[1]) * 25.4) / 72, height: (Number(box[2]) * 25.4) / 72 } : size;
  pageSizeCache.set(key, measured);
  return measured;
}

/**
 * Rozměry pro PDF v CSS px. Stránka = čistý formát + 2 × marginMm (0 = plakát bez okraje,
 * jinak tiskový arch se spadávkou a značkami). Obsah se vykreslí o PDF_OVERSCAN_MM větší
 * než stránka. Vrací celkovou velikost, šířku čistého formátu pro šablonu, spadávku v u
 * a měřítko px/mm pro tiskový arch.
 */
export function pdfRenderSize(
  format: { widthPx: number; heightPx: number },
  trimMm: PrintSizeMm,
  opts: { marginMm: number; bleedMm: number },
) {
  const pageMm = { width: trimMm.width + 2 * opts.marginMm, height: trimMm.height + 2 * opts.marginMm };
  // Tiskový arch (marginMm > 0) přesně 1 : 1 – plakát musí mít po ořezu přesně A4/A3 a okraj archu
  // je bílý, přesah tam není potřeba. Plakát bez okraje se zvětší o přesah, aby vyplnil stránku.
  const pxPerMm =
    opts.marginMm > 0 ? CSS_PX_PER_MM : ((pageMm.width + PDF_OVERSCAN_MM) * CSS_PX_PER_MM) / pageMm.width;
  return {
    width: pageMm.width * pxPerMm,
    height: pageMm.height * pxPerMm,
    trimWidth: trimMm.width * pxPerMm,
    bleedU: (opts.bleedMm / trimMm.width) * 1080,
    pxPerMm,
    pageMm,
  };
}

export async function renderImage({
  url,
  width,
  height,
  fileType,
  scale,
  printSizeMm,
  partnerLogos = [],
}: RenderImageOptions): Promise<Buffer> {
  const browser = await getBrowser();
  // width/height jsou CSS px plakátu (u PDF necelá čísla), okno musí být celé px
  const context = await browser.newContext({
    viewport: { width: Math.ceil(width), height: Math.ceil(height) },
    deviceScaleFactor: scale,
  });
  try {
    const page = await context.newPage();
    // Loga pořadatele nejsou na serveru uložená – požadavky na ně obslouží přímo z paměti
    if (partnerLogos.length > 0) {
      await page.route(/\/__partner-logo\/(\d+)\.png$/, (route) => {
        const index = Number(/(\d+)\.png$/.exec(route.request().url())?.[1]);
        const body = partnerLogos[index];
        return body ? route.fulfill({ status: 200, contentType: 'image/png', body }) : route.fulfill({ status: 404 });
      });
    }
    const response = await page.goto(url, { waitUntil: 'load' });
    if (!response?.ok()) throw new Error(`Stránka /render vrátila ${response?.status()}`);

    // Pojistky: vývojový panel Next.js nesmí skončit v exportu; pozadí stránky černé, aby na hraně
    // PDF (zaokrouhlení rozměru stránky) nikdy nemohl prosvítat bílý proužek
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; } html, body { background: #000 !important; }',
    });

    // Počkat na fonty a dekódování všech obrázků (fotka, SVG logo)
    const check = await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => null)));
      const brandFont = [...document.fonts].some(
        (f) => f.family.replace(/["']/g, '') === 'PD Montserrat' && f.status === 'loaded',
      );
      const brokenImages = [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).length;
      const poster = (document.querySelector('[data-sheet]') ?? document.querySelector('[data-poster]'))?.getBoundingClientRect();
      return { brandFont, brokenImages, w: poster?.width ?? 0, h: poster?.height ?? 0 };
    });

    if (!check.brandFont) throw new Error('Font PD Montserrat se nenačetl.');
    if (check.brokenImages > 0) throw new Error(`${check.brokenImages} obrázek/obrázky se nenačetly.`);
    if (Math.abs(check.w - width) > 1 || Math.abs(check.h - height) > 1) {
      throw new Error(`Plakát má ${check.w}×${check.h} px, očekáváno ${width}×${height} px.`);
    }

    if (fileType === 'pdf') {
      if (!printSizeMm) throw new Error('PDF jde vytvořit jen pro tiskové formáty.');
      // Stránka /render už plakát vykreslila ve velikosti stránky + PDF_OVERSCAN_MM (viz pdfRenderSize).
      // Posun doleva a nahoru tak, aby se přesah ořízl rovnoměrně a okraje zůstaly souměrné.
      // Skutečná stránka je kvůli zaokrouhlení v Chromiu o 0–0,3 mm větší, pro každý rozměr jinak,
      // proto se změří (jednou pro každý rozměr) a posun se dopočítá z ní.
      const isSheet = Boolean(await page.$('[data-sheet]'));
      if (isSheet) {
        // Tiskový arch 1 : 1 začíná v levém horním rohu stránky; o co je stránka kvůli zaokrouhlení
        // větší, to zůstane bílé na pravém/spodním kraji archu (mimo spadávku i značky).
        await page.addStyleTag({ content: 'html, body { background: #fff !important; }' });
      } else {
        const actual = await actualPdfPageMm(page, printSizeMm);
        const contentMm = {
          width: printSizeMm.width + PDF_OVERSCAN_MM,
          height: ((printSizeMm.width + PDF_OVERSCAN_MM) * height) / width,
        };
        const shiftX = ((contentMm.width - actual.width) / 2) * CSS_PX_PER_MM;
        const shiftY = ((contentMm.height - actual.height) / 2) * CSS_PX_PER_MM;
        await page.addStyleTag({ content: `[data-poster] { margin: -${shiftY}px 0 0 -${shiftX}px; }` });
      }
      await page.emulateMedia({ media: 'screen' });
      return await page.pdf(pdfOptions(printSizeMm));
    }

    return await page.screenshot({
      type: fileType,
      quality: fileType === 'jpeg' ? 92 : undefined,
      clip: { x: 0, y: 0, width, height },
      animations: 'disabled',
    });
  } finally {
    await context.close();
  }
}
