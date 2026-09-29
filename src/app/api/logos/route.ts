import { NextResponse } from 'next/server';
import { toWhiteSilhouette } from '@/export/logo-silhouette';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'];

/**
 * Převede nahrané logo pořadatele na bílou siluetu a vrátí ho jako data URL.
 * Nic se neukládá – logo si drží jen stránka pořadatele (po obnovení zmizí).
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Chybí soubor.' }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: 'Soubor je větší než 20 MB.' }, { status: 413 });
  }
  if (file.type && !ACCEPTED.includes(file.type)) {
    return NextResponse.json({ error: `Nepodporovaný formát (${file.type}). Použijte PNG, SVG nebo JPG.` }, { status: 415 });
  }
  try {
    const logo = await toWhiteSilhouette(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({
      dataUrl: `data:image/png;base64,${logo.data.toString('base64')}`,
      width: logo.width,
      height: logo.height,
    });
  } catch (err) {
    console.error('Převod loga selhal', err);
    return NextResponse.json({ error: 'Soubor se nepodařilo zpracovat jako logo.' }, { status: 422 });
  }
}
