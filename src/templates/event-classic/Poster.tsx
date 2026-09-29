// Renderer šablony „event-classic“. Čistá komponenta bez stavu a hooků:
// stejný kód běží v live preview i na interní stránce /render pro export.

import type { CSSProperties } from 'react';
import { colors, font, layout as brandLayout, type } from '@/brand/tokens';
import { geometry, type EventLayout, type TextBlock } from './spec';

export interface PosterProps {
  layout: EventLayout;
  photoUrl: string | null;
  /** skutečné rozměry fotky (px) – z nich se počítá výřez a přiblížení */
  photoSize: { width: number; height: number } | null;
  focalPoint: { x: number; y: number };
  /** přiblížení fotky (1 = fotka právě vyplní oblast) */
  photoZoom?: number;
  logoUrl: string;
  /** loga pořadatele (bílé siluety), max. 2 */
  partnerLogoUrls?: string[];
  /**
   * Spadávka v u (jen PDF pro tiskárnu). Plátno se zvětší o spadávku na každé straně,
   * fotka a černá plocha do ní přetečou; texty a logo zůstanou měřené od čistého formátu.
   */
  bleed?: number;
}

export function Poster({
  layout,
  photoUrl,
  photoSize,
  focalPoint,
  photoZoom = 1,
  logoUrl,
  partnerLogoUrls = [],
  bleed = 0,
}: PosterProps) {
  const px = (u: number) => u * layout.s;
  // Tracking v px pro každý prvek zvlášť: em na kořeni by se přepočítalo z kořenové velikosti písma
  const tracking = (size: number) => `${px(size * font.trackingEm)}px`;

  const root: CSSProperties = {
    position: 'relative',
    width: px(layout.width + 2 * bleed),
    height: px(layout.height + 2 * bleed),
    overflow: 'hidden',
    background: colors.background,
    fontFamily: font.stack,
    fontKerning: 'normal',
    WebkitFontSmoothing: 'antialiased',
  };

  // Levý okraj pásky (block.padLeft) zarovnává první písmeno na společnou svislici; pravý okraj
  // se bere z rightPadSize (u „Historický podcast“ z nadpisu, jinak z vlastní velikosti).
  const textStrip = (block: TextBlock, key: string, rightPadSize = block.size) => (
    <div
      key={key}
      style={{
        height: px(geometry.stripHeight(block.size)),
        lineHeight: `${px(geometry.stripHeight(block.size))}px`,
        padding: `0 ${px(geometry.stripPadRight(rightPadSize))}px 0 ${px(block.padLeft)}px`,
        background: colors.strip,
        color: colors.textOnStrip,
        fontSize: px(block.size),
        fontWeight: type.headline.weight,
        letterSpacing: tracking(block.size),
        whiteSpace: 'nowrap',
        // Zkosení s počátkem na levé hraně: pásky začínají na okraji, text na společné svislici
        transform: `skewY(${geometry.stripSkewDeg}deg)`,
        transformOrigin: '0 50%',
      }}
    >
      <span style={{ position: 'relative', top: px(geometry.stripBaselineShift(block.size)) }}>{block.lines[0]}</span>
    </div>
  );

  const darkLine = (block: TextBlock, weight: number, lineHeight: number = geometry.lineHeight) => (
    <div
      style={{
        paddingLeft: px(block.padLeft),
        color: colors.textOnDark,
        fontSize: px(block.size),
        fontWeight: weight,
        letterSpacing: tracking(block.size),
        lineHeight,
        whiteSpace: 'nowrap',
      }}
    >
      {block.lines[0]}
    </div>
  );

  // Hrana fotky (případně nakloněná) prodloužená o spadávku: y(x) lineárně mezi levým a pravým bodem
  const edgeAt = (x: number) =>
    layout.photoEdge.left + ((layout.photoEdge.right - layout.photoEdge.left) * x) / layout.width;
  const photoEdgeLeft = edgeAt(-bleed) + bleed;
  const photoEdgeRight = edgeAt(layout.width + bleed) + bleed;

  // Fotka vyplní oblast (jako object-fit: cover), zvětšená o přiblížení; poloha podle ohniska
  // (jako object-position): volné místo (oblast − fotka) se rozdělí v poměru ohniska.
  const box = { width: layout.width + 2 * bleed, height: Math.max(photoEdgeLeft, photoEdgeRight) };
  const cover = photoSize ? Math.max(box.width / photoSize.width, box.height / photoSize.height) * photoZoom : 1;
  const img = photoSize ? { width: photoSize.width * cover, height: photoSize.height * cover } : box;
  const imgLeft = (box.width - img.width) * focalPoint.x;
  const imgTop = (box.height - img.height) * focalPoint.y;

  return (
    <div style={root} data-poster>
      {/* čistý formát (ořez); u spadávky posunutý o spadávku dovnitř */}
      <div style={{ position: 'absolute', left: px(bleed), top: px(bleed), width: px(layout.width), height: px(layout.height) }}>
        {photoUrl && (
          <div
            style={{
              position: 'absolute',
              left: -px(bleed),
              top: -px(bleed),
              width: px(box.width),
              height: px(box.height),
              overflow: 'hidden',
              // Hrana fotky – ořez polygonem od levého k pravému bodu hrany
              clipPath: `polygon(0 0, 100% 0, 100% ${px(photoEdgeRight)}px, 0 ${px(photoEdgeLeft)}px)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- export potřebuje přesně tenhle soubor, ne optimalizovanou variantu */}
            <img
              src={photoUrl}
              alt=""
              style={{
                position: 'absolute',
                left: px(imgLeft),
                top: px(imgTop),
                width: px(img.width),
                height: px(img.height),
                maxWidth: 'none',
                display: 'block',
              }}
            />
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            left: px(brandLayout.marginX),
            bottom: px(geometry.textBlockBottom),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: px(geometry.stripGap) }}>
            {textStrip(layout.kicker, 'kicker', layout.brandLine.size)}
            {textStrip(layout.brandLine, 'brand')}
            {/* Páska s městem se zmenšuje s písmem, ale místo pro ni má vždy plnou výšku
                a je zarovnaná nahoru: mezera nad ní ani hrana fotky se nehnou. */}
            <div style={{ height: px(geometry.stripHeight(layout.brandLine.size)) }}>
              {textStrip(layout.cityLine, 'city')}
            </div>
          </div>

          {layout.description.length > 0 && (
            <div style={{ marginTop: px(geometry.gapHeadlineToDescription) }}>
              {layout.description.map((line, i) => (
                <div key={i}>{darkLine(line, type.description.weight, geometry.descriptionLineHeight)}</div>
              ))}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: px(geometry.chip.gap),
              marginTop: px(layout.description.length > 0 ? geometry.gapDescriptionToChips : geometry.gapBlockToChips),
            }}
          >
            {layout.chips.map((text, i) => (
              <div
                key={i}
                style={{
                  height: px(geometry.chip.height),
                  lineHeight: `${px(geometry.chip.height)}px`,
                  padding: `0 ${px(layout.chipPadX)}px`,
                  background: colors.strip,
                  color: colors.textOnStrip,
                  fontSize: px(type.chip.size),
                  fontWeight: type.chip.weight,
                  letterSpacing: tracking(type.chip.size),
                  whiteSpace: 'nowrap',
                }}
              >
                {text}
              </div>
            ))}
          </div>

          <div style={{ marginTop: px(geometry.gapChipsToVenue) }}>{darkLine(layout.venue, type.venue.weight)}</div>
        </div>

        {partnerLogoUrls.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: px(brandLayout.marginX),
              top: px(brandLayout.marginX),
              display: 'flex',
              alignItems: 'center',
              gap: px(brandLayout.partnerLogoGap),
            }}
          >
            {partnerLogoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- export potřebuje přesně tenhle soubor
              <img
                key={url}
                src={url}
                alt=""
                style={{
                  display: 'block',
                  maxWidth: px(brandLayout.partnerLogoBox.width),
                  maxHeight: px(brandLayout.partnerLogoBox.height),
                  width: 'auto',
                  height: 'auto',
                }}
              />
            ))}
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo musí zůstat vektorové i v exportu */}
        <img
          src={logoUrl}
          alt="Přepište dějiny"
          style={{
            position: 'absolute',
            right: px(brandLayout.marginX),
            bottom: px(brandLayout.marginBottom),
            width: px(brandLayout.logoSize),
            height: px(brandLayout.logoSize),
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
