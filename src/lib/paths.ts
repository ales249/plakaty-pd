// Všechny URL assetů jdou přes tyto funkce. Při nasazení pod /plakaty
// stačí nastavit NEXT_PUBLIC_BASE_PATH (a basePath v next.config.ts).

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

export type PhotoVariant = 'preview' | 'full';

export function photoUrl(id: string, variant: PhotoVariant): string {
  return withBase(`/api/photos/${encodeURIComponent(id)}?v=${variant}`);
}

export function partnerLogoUrl(id: string): string {
  return withBase(`/api/logos/${encodeURIComponent(id)}`);
}

export const LOGO_URL = withBase('/brand/logo-pd-dark-bg.svg');
