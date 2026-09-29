import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PhotoRecord, PhotoRepository } from '../ports';

// Schválená knihovna fotek, součást projektu (vytváří scripts/import-photos.mjs):
// content/photos.json + content/photos/<id>.<ext> (původní soubor beze změny)
// + content/photos/previews/<id>.jpg (zmenšenina pro náhled ve formuláři).
const ROOT = path.join(process.cwd(), 'content');
const MANIFEST = path.join(ROOT, 'photos.json');
const DIR = path.join(ROOT, 'photos');

interface ManifestEntry extends PhotoRecord {
  file: string;
}

async function readManifest(): Promise<ManifestEntry[]> {
  try {
    return JSON.parse(await readFile(MANIFEST, 'utf8')) as ManifestEntry[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

/** Záznam bez interních polí (název souboru na disku) */
function toRecord(entry: ManifestEntry): PhotoRecord {
  const { id, originalName, width, height, variant, focalPoint, mimeType } = entry;
  return { id, originalName, width, height, variant, focalPoint, mimeType };
}

export const photoCatalog: PhotoRepository = {
  async list() {
    return (await readManifest()).map(toRecord);
  },

  async get(id) {
    const entry = (await readManifest()).find((p) => p.id === id);
    return entry ? toRecord(entry) : null;
  },

  async readVariant(id, variant) {
    if (!/^[0-9a-f]{12}$/.test(id)) return null;
    const entry = (await readManifest()).find((p) => p.id === id);
    if (!entry) return null;
    try {
      if (variant === 'preview') {
        return { data: await readFile(path.join(DIR, 'previews', `${id}.jpg`)), contentType: 'image/jpeg' };
      }
      return { data: await readFile(path.join(DIR, entry.file)), contentType: entry.mimeType };
    } catch {
      return null;
    }
  },
};
