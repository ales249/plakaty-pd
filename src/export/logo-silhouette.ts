import 'server-only';
import sharp from 'sharp';

// Loga pořadatelů se NEUKLÁDAJÍ (rozhodnutí 2026-09-29): server logo jen převede na bílou
// siluetu a vrátí ho prohlížeči; při exportu ho prohlížeč pošle zpátky s požadavkem.

/**
 * Delší strana převedeného loga. Na plakátu má logo max. 260 × 70 u, tj. u A3 (3,248 px/u)
 * nejvýš ~845 px, u 3:4 ve 2× 520 px → 1000 px stačí a data v požadavku zůstanou malá.
 */
const MAX_SIZE = 1000;

/**
 * Převede logo na bílou siluetu (BRAND-RULES §7): všechny pixely bílé, tvar nese jen průhlednost.
 * - logo s průhledností (PNG, SVG): průhlednost se převezme; části, které se jasem výrazně
 *   liší od převládající barvy loga (bílý nápis v oranžovém tvaru, černý text v bílém rámečku),
 *   se vyříznou jako otvory,
 * - logo bez průhlednosti (JPG, PNG s pozadím): pozadí se odhadne z okrajů obrázku
 *   a průhlednost se odvodí z rozdílu jasu vůči pozadí (funguje pro tmavé logo na světlém
 *   pozadí i světlé logo na tmavém).
 */
export async function toWhiteSilhouette(file: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(file, { density: 300, failOn: 'error' })
    .rotate()
    .resize({ width: MAX_SIZE, height: MAX_SIZE, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const px = width * height;
  const lum = (i: number) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) transparent++;
  const hasAlpha = transparent > px * 0.01;

  // Jas pozadí = průměr jasu okrajových pixelů
  let bgSum = 0;
  let bgCount = 0;
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      bgSum += lum((y * width + x) * 4);
      bgCount++;
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, width - 1]) {
      bgSum += lum((y * width + x) * 4);
      bgCount++;
    }
  }
  const bgLum = bgSum / bgCount;

  // Převládající jas loga = medián jasu neprůhledných pixelů
  let mainLum = 0;
  if (hasAlpha) {
    const hist = new Array<number>(256).fill(0);
    let opaque = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 200) {
        hist[Math.round(lum(i))]++;
        opaque++;
      }
    }
    let acc = 0;
    while (mainLum < 255 && acc + hist[mainLum] < opaque / 2) acc += hist[mainLum++];
  }

  // Plynulý přechod místo ostrého prahu, aby hrany zůstaly vyhlazené
  const ramp = (v: number, from: number, to: number) => Math.min(1, Math.max(0, (v - from) / (to - from)));

  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const alpha = hasAlpha
      ? data[i + 3] * (1 - ramp(Math.abs(lum(i) - mainLum), 70, 110)) // otvory
      : 255 * ramp(Math.abs(lum(i) - bgLum), 24, 110); // pozadí pryč, JPG šum pod prahem
    out[i] = 255;
    out[i + 1] = 255;
    out[i + 2] = 255;
    out[i + 3] = Math.round(alpha);
  }

  const trimmed = await sharp(out, { raw: { width, height, channels: 4 } })
    .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 }, threshold: 1 })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { data: trimmed.data, width: trimmed.info.width, height: trimmed.info.height };
}
