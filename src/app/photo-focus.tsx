'use client';

import type { MouseEvent } from 'react';
import type { FocalPoint, PhotoRecord } from '@/data/ports';
import { photoUrl } from '@/lib/paths';

interface PhotoFocusProps {
  photo: PhotoRecord;
  /** výřez pro tento plakát; undefined = výchozí z knihovny */
  focus: FocalPoint | undefined;
  onChange: (focus: FocalPoint | undefined) => void;
  /** oblast fotky na plakátu v u (šířka 1080 × výška) – určuje, jaká část fotky je vidět */
  area: { width: number; height: number };
  /** přiblížení pro tento plakát (1 = bez) a strop podle kvality fotky ve zvoleném formátu */
  zoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
  /** vysvětlení, když přiblížit nejde */
  zoomDisabledNote: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const round = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Výřez fotky pro jeden plakát. Ukazuje, která část fotky bude na plakátu vidět
 * (object-fit: cover), kliknutím se rámeček vycentruje na zvolené místo. Knihovnu nemění.
 */
export function PhotoFocus({ photo, focus, onChange, area, zoom, maxZoom, onZoomChange, zoomDisabledNote }: PhotoFocusProps) {
  const current = focus ?? photo.focalPoint;

  // cover: fotka se zvětší tak, aby oblast vyplnila (× přiblížení); vidět je jen část o velikosti vis
  const scale = Math.max(area.width / photo.width, area.height / photo.height) * zoom;
  const vis = { w: Math.min(1, area.width / (scale * photo.width)), h: Math.min(1, area.height / (scale * photo.height)) };
  // object-position: levý okraj viditelné části = (1 − vis) × focal
  const frame = { left: (1 - vis.w) * current.x, top: (1 - vis.h) * current.y };

  function pick(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;
    // rámeček vycentrovat na místo kliknutí (u osy, která je vidět celá, na hodnotě nezáleží)
    const x = vis.w < 1 ? clamp01((cx - vis.w / 2) / (1 - vis.w)) : 0.5;
    const y = vis.h < 1 ? clamp01((cy - vis.h / 2) / (1 - vis.h)) : 0.5;
    onChange({ x: round(x), y: round(y) });
  }

  const pct = (v: number) => `${v * 100}%`;

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        Výřez pro tento plakát: kliknutím do fotky určíte, kterou část plakát ukáže. Světlý rámeček = co bude vidět.
      </p>
      <div className="relative cursor-crosshair overflow-hidden rounded-md" onClick={pick}>
        {/* eslint-disable-next-line @next/next/no-img-element -- lokální náhled z vlastního API */}
        <img src={photoUrl(photo.id, 'preview')} alt="" className="block w-full select-none" draggable={false} />
        <div
          className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
          style={{ left: pct(frame.left), top: pct(frame.top), width: pct(vis.w), height: pct(vis.h) }}
        />
      </div>
      <label className="block space-y-1">
        <span className="flex items-center justify-between text-sm font-semibold">
          <span>Přiblížení</span>
          <span className="tabular-nums text-neutral-500">{Math.round(zoom * 100)} %</span>
        </span>
        <input
          type="range"
          min={100}
          max={Math.round(maxZoom * 100)}
          step={1}
          value={Math.round(zoom * 100)}
          disabled={maxZoom <= 1}
          onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
          className="w-full accent-black disabled:opacity-40"
        />
        <span className="block text-xs text-neutral-500">
          {maxZoom <= 1 ? zoomDisabledNote : `Max. ${Math.round(maxZoom * 100)} %, aby fotka neztratila kvalitu.`}
        </span>
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ x: 0.5, y: 0.5 })}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:border-black"
        >
          Vycentrovat
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(undefined);
            onZoomChange(1);
          }}
          disabled={!focus && zoom <= 1}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:border-black disabled:opacity-40 disabled:hover:border-neutral-300"
        >
          Výchozí výřez
        </button>
      </div>
    </div>
  );
}
