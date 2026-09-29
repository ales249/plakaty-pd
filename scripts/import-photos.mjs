// Import schválené knihovny fotek: node scripts/import-photos.mjs "<složka s fotkami>"
//
// Originály se kopírují BEZE ZMĚNY do content/photos/ (do exportu jde původní soubor).
// Vedle se vytvoří zmenšenina pro rychlý náhled (content/photos/previews/) a popis
// content/photos.json. Knihovna se tím NAHRADÍ: fotky, které ve složce nejsou, zmizí.
// Ohnisko výřezu a název se u fotek, které už v knihovně byly, zachovají.
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = process.argv[2];
if (!SRC) {
  console.error('Použití: node scripts/import-photos.mjs "<složka s fotkami>"');
  process.exit(1);
}
const ROOT = path.join(process.cwd(), 'content');
const DIR = path.join(ROOT, 'photos');
const PREVIEWS = path.join(DIR, 'previews');
const MANIFEST = path.join(ROOT, 'photos.json');
const PREVIEW_MAX = 1600;
const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' };
const MIME = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** ČB = téměř žádný pixel nemá rozdíl mezi barevnými kanály (měřeno na zmenšenině) */
async function isGrayscale(file) {
  const { data } = await sharp(file).resize(400, 400, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let colored = 0;
  for (let i = 0; i < data.length; i += 3) {
    const d = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
    if (d > 12) colored++;
  }
  return colored / (data.length / 3) < 0.01;
}

let previous = [];
try {
  previous = JSON.parse(await readFile(MANIFEST, 'utf8'));
} catch {}
const prevById = new Map(previous.map((p) => [p.id, p]));

await rm(DIR, { recursive: true, force: true });
await mkdir(PREVIEWS, { recursive: true });

const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort((a, b) => a.localeCompare(b, 'cs'));
const photos = [];
for (const name of files) {
  const src = path.join(SRC, name);
  const buf = await readFile(src);
  const meta = await sharp(buf).metadata();
  if (!EXT[meta.format]) {
    console.warn(`přeskočeno (formát ${meta.format}): ${name}`);
    continue;
  }
  // Stabilní id z obsahu souboru → stejná fotka má vždy stejné id (plakáty zůstanou platné)
  const id = createHash('sha1').update(buf).digest('hex').slice(0, 12);
  const file = `${id}.${EXT[meta.format]}`;
  await copyFile(src, path.join(DIR, file));
  await sharp(buf).rotate().resize({ width: PREVIEW_MAX, height: PREVIEW_MAX, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toFile(path.join(PREVIEWS, `${id}.jpg`));
  const rotated = (meta.orientation ?? 1) >= 5;
  const prev = prevById.get(id);
  photos.push({
    id,
    file,
    mimeType: MIME[meta.format],
    originalName: name,
    width: rotated ? meta.height : meta.width,
    height: rotated ? meta.width : meta.height,
    variant: (await isGrayscale(buf)) ? 'cb' : 'barva',
    focalPoint: prev?.focalPoint ?? { x: 0.5, y: 0.35 },
  });
  console.log(`${photos.at(-1).variant.padEnd(5)} ${photos.at(-1).width}×${photos.at(-1).height}  ${name}`);
}
await writeFile(MANIFEST, JSON.stringify(photos, null, 2) + '\n');
console.log(`\nKnihovna: ${photos.length} fotek → content/photos.json`);
