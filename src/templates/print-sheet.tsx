// Tiskový arch pro PDF „pro tiskárnu“: plakát se spadávkou na bílém archu s ořezovými značkami.
// Čistá komponenta, rozměry v mm převádí pxPerMm. Značky jsou SVG → v PDF vektorové.

import type { ReactNode } from 'react';

export interface PrintSheetProps {
  pxPerMm: number;
  trimMm: { width: number; height: number };
  /** spadávka (mm) – o tolik plakát přesahuje ořez */
  bleedMm: number;
  /** bílý okraj archu od ořezu (mm) – musí pojmout spadávku i značky */
  marginMm: number;
  /** značky začínají za spadávkou, ve vzdálenosti markOffsetMm od ořezu, a jsou dlouhé markLengthMm */
  markOffsetMm: number;
  markLengthMm: number;
  children: ReactNode;
}

/** 0,25 bodu – běžná tloušťka ořezových značek */
const MARK_STROKE_MM = 0.25 * (25.4 / 72);

export function PrintSheet({ pxPerMm, trimMm, bleedMm, marginMm, markOffsetMm, markLengthMm, children }: PrintSheetProps) {
  const sheet = { width: trimMm.width + 2 * marginMm, height: trimMm.height + 2 * marginMm };
  const x0 = marginMm;
  const x1 = marginMm + trimMm.width;
  const y0 = marginMm;
  const y1 = marginMm + trimMm.height;
  const near = markOffsetMm;
  const far = markOffsetMm + markLengthMm;
  // Pro každý roh vodorovná a svislá čára v prodloužení hrany ořezu, mimo spadávku
  const lines: Array<[number, number, number, number]> = [
    [x0 - far, y0, x0 - near, y0], [x0, y0 - far, x0, y0 - near],
    [x1 + near, y0, x1 + far, y0], [x1, y0 - far, x1, y0 - near],
    [x0 - far, y1, x0 - near, y1], [x0, y1 + near, x0, y1 + far],
    [x1 + near, y1, x1 + far, y1], [x1, y1 + near, x1, y1 + far],
  ];

  return (
    <div
      data-sheet
      style={{ position: 'relative', width: sheet.width * pxPerMm, height: sheet.height * pxPerMm, background: '#FFFFFF', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', left: (marginMm - bleedMm) * pxPerMm, top: (marginMm - bleedMm) * pxPerMm }}>{children}</div>
      <svg
        width={sheet.width * pxPerMm}
        height={sheet.height * pxPerMm}
        viewBox={`0 0 ${sheet.width} ${sheet.height}`}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {lines.map(([ax, ay, bx, by], i) => (
          <line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke="#000000" strokeWidth={MARK_STROKE_MM} />
        ))}
      </svg>
    </div>
  );
}
