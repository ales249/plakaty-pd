import { notFound } from 'next/navigation';
import { decodeInput } from '@/domain/render-url';
import { partnerLogoRepository, photoRepository } from '@/data';
import { LOGO_URL, partnerLogoUrl, photoUrl } from '@/lib/paths';
import {
  BLEED_MM,
  CROP_MARK_LENGTH_MM,
  CROP_MARK_OFFSET_MM,
  FORMAT_IDS,
  FORMATS,
  PRINT_SHEET_MARGIN_MM,
  type FormatId,
} from '@/domain/formats';
import { PrintSheet } from '@/templates/print-sheet';
import { Poster } from '@/templates/event-classic/Poster';
import { computeLayout } from '@/templates/event-classic/spec';

// Interní stránka pro export: vykreslí jeden plakát 1:1 bez jakéhokoli UI.
export default async function RenderPage({ searchParams }: PageProps<'/render'>) {
  const params = await searchParams;
  const d = typeof params.d === 'string' ? params.d : null;
  const f = typeof params.f === 'string' ? params.f : null;
  if (!d || !f || !(FORMAT_IDS as readonly string[]).includes(f)) notFound();

  let input;
  try {
    input = decodeInput(d);
  } catch {
    notFound();
  }
  const photo = await photoRepository.get(input.photoId);
  if (!photo) notFound();

  const logoIds = input.partnerLogoIds ?? [];
  const logos = await Promise.all(logoIds.map((id) => partnerLogoRepository.get(id)));
  if (logos.some((l) => !l)) notFound();

  // w = šířka plakátu v CSS px pro PDF (stránka + přesah); šablona vše počítá z šířky
  const format = FORMATS[f as FormatId];
  const w = typeof params.w === 'string' ? Number(params.w) : NaN;
  const target = Number.isFinite(w) && w > 0 ? { ...format, widthPx: w, heightPx: (w * format.heightPx) / format.widthPx } : format;
  const layout = computeLayout(input, target);
  // b = spadávka v u (jen PDF pro tiskárnu)
  const b = typeof params.b === 'string' ? Number(params.b) : 0;
  const bleed = Number.isFinite(b) && b > 0 && b < 100 ? b : 0;
  const poster = (
    <Poster
      layout={layout}
      photoUrl={photoUrl(photo.id, 'full')}
      photoSize={{ width: photo.width, height: photo.height }}
      focalPoint={input.photoFocus ?? photo.focalPoint}
      photoZoom={input.photoZoom}
      logoUrl={LOGO_URL}
      partnerLogoUrls={logoIds.map(partnerLogoUrl)}
      bleed={bleed}
    />
  );

  // sheet = px/mm tiskového archu (PDF pro tiskárnu): spadávka + ořezové značky
  const sheet = typeof params.sheet === 'string' ? Number(params.sheet) : NaN;
  if (!(Number.isFinite(sheet) && sheet > 0) || !format.print) return poster;
  return (
    <PrintSheet
      pxPerMm={sheet}
      trimMm={{ width: format.print.widthMm, height: format.print.heightMm }}
      bleedMm={BLEED_MM}
      marginMm={PRINT_SHEET_MARGIN_MM}
      markOffsetMm={CROP_MARK_OFFSET_MM}
      markLengthMm={CROP_MARK_LENGTH_MM}
    >
      {poster}
    </PrintSheet>
  );
}
