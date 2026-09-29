import { NextResponse, type NextRequest } from 'next/server';
import { BLEED_MM, exportScale, fileTypesFor, FORMATS, PRINT_SHEET_MARGIN_MM } from '@/domain/formats';
import { renderRequestSchema } from '@/domain/poster-input';
import { encodeInput } from '@/domain/render-url';
import { partnerLogoRepository, photoRepository } from '@/data';
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
  const { input, formatId, fileType, bleed } = parsed.data;
  const format = FORMATS[formatId];
  if (format.status !== 'ready') {
    return NextResponse.json({ error: `Formát ${format.label} zatím není hotový.` }, { status: 400 });
  }
  if (!fileTypesFor(format).includes(fileType)) {
    return NextResponse.json({ error: `Formát ${format.label} nejde stáhnout jako ${fileType.toUpperCase()}.` }, { status: 400 });
  }
  if (!(await photoRepository.get(input.photoId))) {
    return NextResponse.json({ error: 'Vybraná fotka neexistuje.' }, { status: 400 });
  }
  const logos = await Promise.all((input.partnerLogoIds ?? []).map((id) => partnerLogoRepository.get(id)));
  if (logos.some((l) => !l)) {
    return NextResponse.json({ error: 'Vybrané logo pořadatele neexistuje.' }, { status: 400 });
  }
  const { errors } = computeLayout(input, format);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.map((e) => e.message).join(' ') }, { status: 422 });
  }

  const url = new URL(withBase('/render'), request.nextUrl.origin);
  url.searchParams.set('d', encodeInput(input));
  url.searchParams.set('f', formatId);
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
