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

/**
 * Adresa loga pořadatele na interní stránce /render. Soubor neexistuje – export ho
 * při vykreslení podstrčí z dat požadavku (Playwright page.route), nic se neukládá.
 */
export function partnerLogoRenderUrl(index: number): string {
  return withBase(`/__partner-logo/${index}.png`);
}

export const LOGO_URL = withBase('/brand/logo-pd-dark-bg.svg');
