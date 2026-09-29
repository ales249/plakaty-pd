'use client';

import { useRef, useState } from 'react';
import { PARTNER_LOGOS_MAX } from '@/domain/poster-input';
import { withBase } from '@/lib/paths';

/** Logo pořadatele převedené na bílou siluetu. Drží se jen ve stránce, nikam se neukládá. */
export interface PartnerLogo {
  key: string;
  name: string;
  dataUrl: string;
}

interface PartnerLogosProps {
  logos: PartnerLogo[];
  onChange: (logos: PartnerLogo[]) => void;
}

export function PartnerLogos({ logos, onChange }: PartnerLogosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = logos.length >= PARTNER_LOGOS_MAX;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    let next = logos;
    for (const file of Array.from(files)) {
      if (next.length >= PARTNER_LOGOS_MAX) {
        setError(`Na plakát se vejdou max. ${PARTNER_LOGOS_MAX} loga.`);
        break;
      }
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(withBase('/api/logos'), { method: 'POST', body });
      const data: { dataUrl: string } | { error: string } = await res.json();
      if (!res.ok || 'error' in data) {
        setError(`${file.name}: ${'error' in data ? data.error : 'nahrání selhalo'}`);
        continue;
      }
      next = [...next, { key: crypto.randomUUID(), name: file.name, dataUrl: data.dataUrl }];
    }
    onChange(next);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          Max. {PARTNER_LOGOS_MAX} loga, vlevo nahoře na fotce. Převedou se na bílou, nejlépe PNG nebo SVG s průhledným
          pozadím. Neukládají se – po obnovení stránky je nahrajte znovu.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || full}
          className="shrink-0 rounded-md bg-black px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {uploading ? 'Nahrávám…' : 'Nahrát logo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/svg+xml,image/jpeg,image/webp"
          multiple
          hidden
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {logos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {logos.map((l, i) => (
            <div key={l.key} className="relative flex h-16 items-center justify-center rounded-md bg-black p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL převedeného loga */}
              <img src={l.dataUrl} alt={l.name} title={l.name} className="max-h-full max-w-full object-contain" />
              <span className="absolute top-1 left-1 rounded bg-white px-1 text-[10px] font-bold">{i + 1}</span>
              <button
                type="button"
                onClick={() => onChange(logos.filter((x) => x.key !== l.key))}
                aria-label={`Odebrat logo ${l.name}`}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-white/85 text-xs text-black hover:bg-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
