import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { BLEED_MM, exportScale, fileTypesFor, FORMATS, maxPhotoZoom, PRINT_SHEET_MARGIN_MM } from '@/domain/formats';
import { renderRequestSchema } from '@/domain/poster-input';
import { encodeInput } from '@/domain/render-url';
import { photoRepository } from '@/data';
import { setPrintBoxes } from '@/export/pdf-boxes';
import { pdfRenderSize, renderImage } from '@/export/render-image';
import { computeLayout } from '@/templates/event-classic/spec';
import { withBase } from '@/lib/paths';

export const maxDuration = 60;

function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(request: NextRequest) {
  const parsed = renderRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Neplatná data formuláře.', issues: parsed.error.issues }, { status: 400 });
  }
  const { input, formatId, fileType, bleed, partnerLogos = [] } = parsed.data;
  const format = FORMATS[formatId];
  if (format.status !== 'ready') {
    return NextResponse.json({ error: `Formát ${format.label} zatím není hotový.` }, { status: 400 });
  }
  if (!fileTypesFor(format).includes(fileType)) {
    return NextResponse.json({ error: `Formát ${format.label} nejde stáhnout jako ${fileType.toUpperCase()}.` }, { status: 400 });
  }
  const photo = await photoRepository.get(input.photoId);
  if (!photo) {
    return NextResponse.json({ error: 'Vybraná fotka neexistuje.' }, { status: 400 });
  }
  // Loga pořadatele z požadavku (neukládají se): musí to být skutečné PNG
  const logoBuffers = partnerLogos.map((dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
  const logoFormats = await Promise.all(logoBuffers.map((b) => sharp(b).metadata().then((m) => m.format).catch(() => null)));
  if (logoFormats.some((f) => f !== 'png')) {
    return NextResponse.json({ error: 'Logo pořadatele se nepodařilo načíst, nahrajte ho znovu.' }, { status: 400 });
  }
  const { errors, photoHeight } = computeLayout(input, format);
  // Přiblížení nesmí zhoršit kvalitu fotky ve zvoleném formátu (stejný strop jako ve formuláři)
  if ((input.photoZoom ?? 1) > maxPhotoZoom(format, photo, photoHeight) + 0.005) {
    return NextResponse.json({ error: 'Fotka je pro tento formát přiblížená víc, než snese její rozlišení.' }, { status: 422 });
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.map((e) => e.message).join(' ') }, { status: 422 });
  }

  // Export si otevírá /render v Chromiu na serveru. Za reverzní proxy nastavte RENDER_ORIGIN
  // na interní adresu aplikace (např. http://127.0.0.1:3000), jinak se použije adresa požadavku.
  const url = new URL(withBase('/render'), process.env.RENDER_ORIGIN || request.nextUrl.origin);
  url.searchParams.set('d', encodeInput(input));
  url.searchParams.set('f', formatId);
  if (logoBuffers.length > 0) url.searchParams.set('logos', String(logoBuffers.length));
  // PDF: plakát se vykreslí rovnou ve velikosti stránky (+ přesah), aby ji beze zbytku vyplnil
  const trimMm = format.print ? { width: format.print.widthMm, height: format.print.heightMm } : null;
  const withBleed = fileType === 'pdf' && bleed === true;
  // PDF pro tiskárnu = tiskový arch: spadávka + ořezové značky na bílém okraji
  const size =
    fileType === 'pdf' && trimMm
      ? pdfRenderSize(format, trimMm, withBleed ? { marginMm: PRINT_SHEET_MARGIN_MM, bleedMm: BLEED_MM } : { marginMm: 0, bleedMm: 0 })
      : null;
  if (size) {
    url.searchParams.set('w', String(size.trimWidth));
    if (withBleed) {
      url.searchParams.set('b', String(size.bleedU));
      url.searchParams.set('sheet', String(size.pxPerMm));
    }
  }

  try {
    const image = await renderImage({
      url: url.toString(),
      width: size?.width ?? format.widthPx,
      height: size?.height ?? format.heightPx,
      fileType,
      scale: exportScale(format),
      printSizeMm: size?.pageMm,
      partnerLogos: logoBuffers,
    });
    const output = withBleed && trimMm ? await setPrintBoxes(image, trimMm, BLEED_MM, PRINT_SHEET_MARGIN_MM) : image;
    const ext = { pdf: 'pdf', png: 'png', jpeg: 'jpg' }[fileType];
    // „v Karlových Varech“ → „karlovych-varech“
    const place = slug(input.cityHeadline.replace(/^(ve?)\s+/i, ''));
    const filename = `prepiste-dejiny-${place}-${input.date}-${formatId}${withBleed ? '-pro-tiskarnu' : ''}.${ext}`;
    return new NextResponse(new Uint8Array(output), {
      headers: {
        'Content-Type': { pdf: 'application/pdf', png: 'image/png', jpeg: 'image/jpeg' }[fileType],
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('Export selhal', err);
    return NextResponse.json({ error: `Export selhal: ${(err as Error).message}` }, { status: 500 });
  }
}
