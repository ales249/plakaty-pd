// Rozhraní úložišť. Aplikace zná jen tato rozhraní; lokálně je implementuje
// souborový systém (src/data/local), v produkci DB + objektové úložiště.

import type { PhotoVariant } from '@/lib/paths';

export interface FocalPoint {
  /** 0–1 zleva */
  x: number;
  /** 0–1 shora */
  y: number;
}

export type PhotoMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

/** Fotka ze schválené knihovny (content/photos.json). Pořadatel ji jen vybírá. */
export interface PhotoRecord {
  id: string;
  originalName: string;
  /** rozměry původního souboru (po EXIF otočení) */
  width: number;
  height: number;
  /** ČB nebo barevná varianta */
  variant: 'cb' | 'barva';
  /** střed výřezu 0–1; nastavuje se v content/photos.json */
  focalPoint: FocalPoint;
  mimeType: PhotoMimeType;
}

export interface PhotoFile {
  data: Buffer;
  contentType: string;
}

/**
 * Schválená knihovna fotek – jen pro čtení. Fotky se mění importem
 * (scripts/import-photos.mjs), ne přes aplikaci.
 */
export interface PhotoRepository {
  list(): Promise<PhotoRecord[]>;
  get(id: string): Promise<PhotoRecord | null>;
  readVariant(id: string, variant: PhotoVariant): Promise<PhotoFile | null>;
}
