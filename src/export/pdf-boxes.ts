import 'server-only';
import { PDFDocument } from '@cantoo/pdf-lib';

const PT_PER_MM = 72 / 25.4;

/**
 * Zapíše do PDF tiskové rámečky: TrimBox = čistý formát (linie řezu), BleedBox = ořez + spadávka.
 * Tiskárny a Acrobat podle nich poznají ořez i spadávku. Tiskový arch začíná v levém horním rohu
 * stránky v měřítku 1 : 1 a ořez je od jeho okraje marginMm (PDF má počátek vlevo dole).
 */
export async function setPrintBoxes(
  pdf: Buffer,
  trimMm: { width: number; height: number },
  bleedMm: number,
  marginMm: number,
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdf);
  const page = doc.getPage(0);
  const media = page.getMediaBox();
  const trimW = trimMm.width * PT_PER_MM;
  const trimH = trimMm.height * PT_PER_MM;
  const bleed = bleedMm * PT_PER_MM;
  const x = media.x + marginMm * PT_PER_MM;
  const y = media.y + media.height - (marginMm * PT_PER_MM + trimH);
  page.setTrimBox(x, y, trimW, trimH);
  page.setBleedBox(x - bleed, y - bleed, trimW + 2 * bleed, trimH + 2 * bleed);
  return Buffer.from(await doc.save());
}
