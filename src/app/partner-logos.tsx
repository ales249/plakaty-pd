'use client';

import { useRef, useState } from 'react';
import type { PartnerLogoRecord } from '@/data/ports';
import { PARTNER_LOGOS_MAX } from '@/domain/poster-input';
import { partnerLogoUrl, withBase } from '@/lib/paths';

interface PartnerLogosProps {
  logos: PartnerLogoRecord[];
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  onLogosChange: (logos: PartnerLogoRecord[]) => void;
}

export function PartnerLogos({ logos, selectedIds, onSelectedChange, onLogosChange }: PartnerLogosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = selectedIds.length >= PARTNER_LOGOS_MAX;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    let next = logos;
    let selected = selectedIds;
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(withBase('/api/logos'), { method: 'POST', body });
      const data: PartnerLogoRecord | { error: string } = await res.json();
      if (!res.ok || 'error' in data) {
        setError(`${file.name}: ${'error' in data ? data.error : 'nahrání selhalo'}`);
        continue;
      }
      next = [data, ...next];
      // nově nahrané logo se rovnou vybere, pokud je volné místo
      if (selected.length < PARTNER_LOGOS_MAX) selected = [...selected, data.id];
    }
    onLogosChange(next);
    onSelectedChange(selected);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) onSelectedChange(selectedIds.filter((s) => s !== id));
    else if (!full) onSelectedChange([...selectedIds, id]);
  }

  async function remove(id: string) {
    if (!window.confirm('Smazat logo z knihovny?')) return;
    const res = await fetch(withBase(`/api/logos/${id}`), { method: 'DELETE' });
    if (!res.ok) {
      setError('Smazání selhalo.');
      return;
    }
    onLogosChange(logos.filter((l) => l.id !== id));
    onSelectedChange(selectedIds.filter((s) => s !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          Max. {PARTNER_LOGOS_MAX} loga, vlevo nahoře na fotce. Převedou se na bílou, nejlépe PNG nebo SVG s průhledným
          pozadím.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 rounded-md bg-black px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
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
        <div className="grid grid-cols-3 gap-2">
          {logos.map((l) => {
            const selected = selectedIds.includes(l.id);
            return (
              <div key={l.id} className="group relative">
                <button
                  type="button"
                  onClick={() => toggle(l.id)}
                  disabled={!selected && full}
                  title={l.originalName}
                  aria-pressed={selected}
                  className={`flex h-16 w-full items-center justify-center rounded-md bg-black p-2 outline-offset-2 disabled:opacity-30 ${
                    selected ? 'outline-3 outline-black' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- lokální náhled z vlastního API */}
                  <img src={partnerLogoUrl(l.id)} alt={l.originalName} className="max-h-full max-w-full object-contain" />
                </button>
                {selected && (
                  <span className="pointer-events-none absolute top-1 left-1 rounded bg-white px-1 text-[10px] font-bold">
                    {selectedIds.indexOf(l.id) + 1}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(l.id)}
                  aria-label="Smazat logo"
                  className="absolute top-1 right-1 hidden h-6 w-6 rounded-full bg-white/80 text-xs text-black group-hover:block"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
