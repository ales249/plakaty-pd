'use client';

import type { PhotoRecord } from '@/data/ports';
import { photoUrl } from '@/lib/paths';

interface PhotoLibraryProps {
  photos: PhotoRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Schválená knihovna fotek – pořadatel jen vybírá (nahrávání a mazání není). */
export function PhotoLibrary({ photos, selectedId, onSelect }: PhotoLibraryProps) {
  if (photos.length === 0) {
    return <p className="text-sm text-neutral-500">Knihovna fotek je prázdná.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((p) => {
        const selected = p.id === selectedId;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            aria-pressed={selected}
            aria-label={`Fotka ${p.variant === 'cb' ? 'ČB' : 'barevná'}`}
            className={`relative block aspect-[3/2] w-full overflow-hidden rounded-md outline-offset-2 ${
              selected ? 'outline-3 outline-black' : 'opacity-80 hover:opacity-100'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- lokální náhled z vlastního API */}
            <img src={photoUrl(p.id, 'preview')} alt="" className="h-full w-full object-cover" />
            <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {p.variant === 'cb' ? 'ČB' : 'Barva'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
