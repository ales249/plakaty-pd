import { NextResponse } from 'next/server';
import { photoRepository } from '@/data';

// Knihovna fotek je jen pro čtení (mění se importem, viz scripts/import-photos.mjs)
export async function GET() {
  return NextResponse.json(await photoRepository.list());
}
