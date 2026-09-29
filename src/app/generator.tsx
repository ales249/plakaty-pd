'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  BLEED_MM,
  exportScale,
  PRINT_SHEET_MARGIN_MM,
  fileTypesFor,
  FORMAT_IDS,
  FORMATS,
  photoUpscale,
  type FileType,
  type FormatId,
} from '@/domain/formats';
import {
  CITY_HEADLINE_MAX_CHARS,
  DESCRIPTION_LINE_CHARS,
  DESCRIPTION_MAX_CHARS,
  DESCRIPTION_MAX_LINES,
  posterInputSchema,
  VENUE_MAX_CHARS,
  type PosterInput,
} from '@/domain/poster-input';
import type { PartnerLogoRecord, PhotoRecord } from '@/data/ports';
import { LOGO_URL, partnerLogoUrl, photoUrl, withBase } from '@/lib/paths';
import { computeLayout, TEMPLATE_ID, wrapByChars, type LayoutField } from '@/templates/event-classic/spec';
import { PartnerLogos } from './partner-logos';
import { PhotoFocus } from './photo-focus';
import { PhotoLibrary } from './photo-library';
import { PosterPreview } from './poster-preview';

type TextField = 'cityHeadline' | 'description' | 'venue' | 'date' | 'time';
type FieldErrors = Partial<Record<TextField | 'photoId', string>>;

const CHAR_LIMITS: Partial<Record<TextField, number>> = {
  cityHeadline: CITY_HEADLINE_MAX_CHARS,
  description: DESCRIPTION_MAX_CHARS,
  venue: VENUE_MAX_CHARS,
};

const fitsDescription = (text: string) => wrapByChars(text, DESCRIPTION_LINE_CHARS).length <= DESCRIPTION_MAX_LINES;

/**
 * Popis nesmí přesáhnout povolený počet řádků.
 * - psaní (změna o 1 znak): znak, který by se nevešel, se nepřijme,
 * - vložení delšího textu: ořízne se na konci posledního celého slova,
 * - mezery na konci se slučují do jedné, když by se nové slovo už nevešlo.
 */
function fitDescription(next: string, prev: string): string {
  let fitted = next;
  if (!fitsDescription(next)) {
    if (next.length - prev.length <= 1) {
      fitted = prev;
    } else {
      while (!fitsDescription(fitted)) fitted = fitted.slice(0, -1);
      if (/\S/.test(next[fitted.length]) && /\s/.test(fitted)) fitted = fitted.replace(/\S+$/, '');
    }
  }
  if (/\s\s$/.test(fitted) && !fitsDescription(`${fitted.trimEnd()} x`)) fitted = `${fitted.trimEnd()} `;
  return fitted;
}

const INITIAL: PosterInput = {
  templateId: TEMPLATE_ID,
  photoId: '',
  cityHeadline: 'v Karlových Varech',
  description: '',
  venue: '',
  date: '2026-11-18',
  time: '19:00',
};

interface GeneratorProps {
  initialPhotos: PhotoRecord[];
  initialLogos: PartnerLogoRecord[];
}

export function Generator({ initialPhotos, initialLogos }: GeneratorProps) {
  const photos = initialPhotos;
  const [logos, setLogos] = useState(initialLogos);
  const [input, setInput] = useState<PosterInput>({ ...INITIAL, photoId: initialPhotos[0]?.id ?? '' });
  // Chyby u pole se ukazují až po první úpravě, aby prázdný formulář nesvítil červeně
  const [touched, setTouched] = useState<ReadonlySet<TextField>>(new Set());
  const [formatId, setFormatId] = useState<FormatId>('poster-3x4');
  const [exporting, setExporting] = useState<FileType | null>(null);
  const [bleed, setBleed] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const format = FORMATS[formatId];
  const photo = photos.find((p) => p.id === input.photoId) ?? null;
  const layout = useMemo(() => computeLayout(input, format), [input, format]);
  // Varování, když fotka nemá dost pixelů pro zvolený formát (hlavně A3). 15 % zvětšení je v tisku nepoznatelné.
  const upscale = photo ? photoUpscale(format, photo, layout.photoHeight) : 1;
  // Jen u tisku: na sítích je zvětšení menších fotek z knihovny (~25 %) nepoznatelné
  const lowResWarning =
    photo && format.print && upscale > 1.15
      ? `Tahle fotka má nižší rozlišení a pro ${format.label} se musí zvětšit o ${Math.round((upscale - 1) * 100)} %, v tisku může být méně ostrá. Pro velký tisk je lepší některá z velkých fotek.`
      : null;

  const errors = useMemo<FieldErrors>(() => {
    const out: FieldErrors = {};
    const parsed = posterInputSchema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as TextField | 'photoId';
        out[key] ??= issue.message;
      }
    }
    for (const e of layout.errors) out[e.field as LayoutField] ??= e.message;
    return out;
  }, [input, layout.errors]);
  const hasErrors = Object.keys(errors).length > 0;
  const shown = (field: TextField) => (touched.has(field) ? errors[field] : undefined);
  const descriptionLineCount = wrapByChars(input.description ?? '', DESCRIPTION_LINE_CHARS).length;
  // Plno = nové slovo by se už nevešlo
  const descriptionFull = !fitsDescription(`${(input.description ?? '').trimEnd()} x`);

  function update(field: TextField, raw: string) {
    // NFC: „ě“ je vždy 1 znak (macOS někdy vkládá rozložený tvar e + háček).
    // Oříznutí jistí limit i tam, kde ho maxLength neuhlídá (skládání diakritiky, starší stav).
    const normalized = raw.normalize('NFC');
    const max = CHAR_LIMITS[field];
    const limited = max === undefined ? normalized : normalized.slice(0, max);
    setInput((prev) => {
      const value = field === 'description' ? fitDescription(limited, prev.description ?? '') : limited;
      return { ...prev, [field]: value };
    });
    setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  }

  async function exportFile(fileType: FileType) {
    setExporting(fileType);
    setExportError(null);
    try {
      const res = await fetch(withBase('/api/export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, formatId, fileType, bleed: fileType === 'pdf' && bleed }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Chyba ${res.status}`);
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `plakat.${fileType}`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setExporting(null);
    }
  }

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-6 md:px-8 lg:grid-cols-[420px_1fr]">
      <section className="min-w-0 space-y-6">
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight">Plakát akce</h1>
          <p className="text-sm text-neutral-600">Přepište dějiny · generátor vizuálů</p>
        </header>

        <Group title="Akce">
          <Field
            label="Město v nadpisu"
            hint="Tvar za „Přepište dějiny“ — zkontrolujte skloňování."
            error={shown('cityHeadline')}
            counter={{ count: input.cityHeadline.length, max: CITY_HEADLINE_MAX_CHARS }}
          >
            <input
              className={input.cityHeadline.length >= CITY_HEADLINE_MAX_CHARS ? inputAtLimitCls : inputCls}
              value={input.cityHeadline}
              maxLength={CITY_HEADLINE_MAX_CHARS}
              onChange={(e) => update('cityHeadline', e.target.value)}
            />
          </Field>
          <Field
            label="Popis akce (nepovinné)"
            hint={`Max. ${DESCRIPTION_MAX_LINES} řádky po ${DESCRIPTION_LINE_CHARS} znacích, pak už psát nepůjde.`}
            error={shown('description')}
            counter={{ count: descriptionLineCount, max: DESCRIPTION_MAX_LINES, unit: 'řádky' }}
            limit={{ reached: descriptionFull, message: 'Plné 3 řádky, víc se na plakát nevejde. Zkraťte text.' }}
          >
            <textarea
              rows={3}
              className={descriptionFull ? inputAtLimitCls : inputCls}
              value={input.description ?? ''}
              maxLength={DESCRIPTION_MAX_CHARS}
              onChange={(e) => update('description', e.target.value)}
            />
          </Field>
          <Field
            label="Místo konání"
            hint="Kde akce proběhne, např. Městská knihovna Jihlava."
            error={shown('venue')}
            counter={{ count: input.venue.length, max: VENUE_MAX_CHARS }}
          >
            <input
              className={input.venue.length >= VENUE_MAX_CHARS ? inputAtLimitCls : inputCls}
              value={input.venue}
              maxLength={VENUE_MAX_CHARS}
              onChange={(e) => update('venue', e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Datum" error={shown('date')}>
              <input type="date" className={inputCls} value={input.date} onChange={(e) => update('date', e.target.value)} />
            </Field>
            <Field label="Čas" error={shown('time')}>
              <input type="time" className={inputCls} value={input.time} onChange={(e) => update('time', e.target.value)} />
            </Field>
          </div>
        </Group>

        <Group title="Fotografie">
          <PhotoLibrary
            photos={photos}
            selectedId={input.photoId}
            onSelect={(id) => setInput((prev) => ({ ...prev, photoId: id, photoFocus: undefined }))}
          />
          {errors.photoId && <p className="text-sm text-red-700">{errors.photoId}</p>}
          {photo && (
            <PhotoFocus
              photo={photo}
              focus={input.photoFocus}
              onChange={(photoFocus) => setInput((prev) => ({ ...prev, photoFocus }))}
              area={{ width: layout.width, height: layout.photoHeight }}
            />
          )}
        </Group>

        <Group title="Loga pořadatele (nepovinné)">
          <PartnerLogos
            logos={logos}
            selectedIds={input.partnerLogoIds ?? []}
            onSelectedChange={(ids) => setInput((prev) => ({ ...prev, partnerLogoIds: ids }))}
            onLogosChange={setLogos}
          />
        </Group>
      </section>

      <section className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="flex flex-wrap gap-2">
          {FORMAT_IDS.map((id) => {
            const f = FORMATS[id];
            const ready = f.status === 'ready';
            return (
              <button
                key={id}
                type="button"
                disabled={!ready}
                onClick={() => setFormatId(id)}
                className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                  id === formatId ? 'border-black bg-black text-white' : 'border-neutral-300 bg-white'
                } disabled:cursor-not-allowed disabled:opacity-40`}
                title={ready ? `${f.widthPx} × ${f.heightPx} px` : 'Připravujeme'}
              >
                {f.label}
                {!ready && ' · brzy'}
              </button>
            );
          })}
        </div>

        <div className="mx-auto w-full max-w-[560px]">
          <PosterPreview
            widthPx={format.widthPx}
            heightPx={format.heightPx}
            layout={layout}
            photoUrl={photo ? photoUrl(photo.id, 'preview') : null}
            focalPoint={input.photoFocus ?? photo?.focalPoint ?? { x: 0.5, y: 0.5 }}
            logoUrl={LOGO_URL}
            partnerLogoUrls={(input.partnerLogoIds ?? []).map(partnerLogoUrl)}
          />
        </div>

        <div className="mx-auto flex w-full max-w-[560px] flex-wrap items-center gap-3">
          {fileTypesFor(format).map((t) => (
            <button
              key={t}
              type="button"
              disabled={hasErrors || exporting !== null}
              onClick={() => exportFile(t)}
              className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              {exporting === t ? 'Generuji…' : `Stáhnout ${t.toUpperCase()}`}
            </button>
          ))}
          <span className="text-xs text-neutral-500">
            {format.print && `${format.print.widthMm} × ${format.print.heightMm} mm · `}
            {format.widthPx * exportScale(format)} × {format.heightPx * exportScale(format)} px
          </span>
        </div>
        {format.print && (
          <label className="mx-auto flex w-full max-w-[560px] items-center gap-2 text-sm">
            <input type="checkbox" checked={bleed} onChange={(e) => setBleed(e.target.checked)} className="h-4 w-4 accent-black" />
            <span>
              PDF pro tiskárnu: spadávka {BLEED_MM} mm + ořezové značky
              <span className="text-neutral-500">
                {' '}
                (arch {format.print.widthMm + 2 * PRINT_SHEET_MARGIN_MM} × {format.print.heightMm + 2 * PRINT_SHEET_MARGIN_MM} mm)
              </span>
            </span>
          </label>
        )}
        {hasErrors && (
          <p className="mx-auto max-w-[560px] text-sm text-red-700">
            {Object.values(errors)[0]?.replace(/\.$/, '')}. Pak půjde plakát stáhnout.
          </p>
        )}
        {exportError && <p className="mx-auto max-w-[560px] text-sm text-red-700">{exportError}</p>}
        {lowResWarning && <p className="mx-auto max-w-[560px] text-sm text-amber-700">{lowResWarning}</p>}
      </section>
    </main>
  );
}

const inputCls =
  'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black';
const inputAtLimitCls =
  'w-full rounded-md border-2 border-red-600 bg-red-50 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <legend className="px-1 text-xs font-bold tracking-wider text-neutral-500 uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  /** počítadlo (výchozí jednotka: znaky); na limitu zčervená */
  counter?: { count: number; max: number; unit?: string };
  /** vlastní podmínka a hláška limitu (jinak: počítadlo dosáhlo maxima) */
  limit?: { reached: boolean; message: string };
  children: ReactNode;
}

function Field({ label, hint, error, counter, limit, children }: FieldProps) {
  const atLimit = limit ? limit.reached : counter !== undefined && counter.count >= counter.max;
  const limitMessage = limit?.message ?? `Dosažen limit ${counter?.max} znaků, víc se na plakát nevejde.`;
  return (
    <label className="block space-y-1">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      <span className="flex items-start justify-between gap-3 text-xs">
        {error ? (
          <span className="text-red-700">{error}</span>
        ) : atLimit ? (
          <span className="font-semibold text-red-700">{limitMessage}</span>
        ) : (
          <span className="text-neutral-500">{hint}</span>
        )}
        {counter && (
          <span className={`shrink-0 tabular-nums ${atLimit ? 'font-bold text-red-700' : 'text-neutral-500'}`}>
            {counter.count}/{counter.max}
            {counter.unit && ` ${counter.unit}`}
          </span>
        )}
      </span>
    </label>
  );
}
