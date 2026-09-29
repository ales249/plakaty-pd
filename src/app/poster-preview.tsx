'use client';

import { useEffect, useRef, useState } from 'react';
import { Poster, type PosterProps } from '@/templates/event-classic/Poster';

/**
 * Live preview: plakát se vykreslí v plné velikosti (stejně jako při exportu)
 * a jen se opticky zmenší přes transform: scale().
 */
export function PosterPreview(props: PosterProps & { widthPx: number; heightPx: number }) {
  const { widthPx, heightPx, ...posterProps } = props;
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(0);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = frameWidth > 0 ? frameWidth / widthPx : 0;

  return (
    <div ref={frameRef} className="relative w-full overflow-hidden bg-black shadow-xl" style={{ aspectRatio: `${widthPx} / ${heightPx}` }}>
      {scale > 0 && (
        <div style={{ width: widthPx, height: heightPx, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <Poster {...posterProps} />
        </div>
      )}
    </div>
  );
}
