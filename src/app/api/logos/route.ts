import { NextResponse } from 'next/server';
import { partnerLogoRepository } from '@/data';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'];

export async function GET() {
  return NextResponse.json(await partnerLogoRepository.list());
}

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
    const record = await partnerLogoRepository.create(Buffer.from(await file.arrayBuffer()), file.name);
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error('Nahrání loga selhalo', err);
    return NextResponse.json({ error: 'Soubor se nepodařilo zpracovat jako logo.' }, { status: 422 });
  }
}
