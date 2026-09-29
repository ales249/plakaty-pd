import { NextResponse } from 'next/server';
import { partnerLogoRepository } from '@/data';

export async function GET(_request: Request, ctx: RouteContext<'/api/logos/[id]'>) {
  const { id } = await ctx.params;
  const data = await partnerLogoRepository.read(id);
  if (!data) return new NextResponse('Nenalezeno', { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=31536000, immutable' },
  });
}

export async function DELETE(_request: Request, ctx: RouteContext<'/api/logos/[id]'>) {
  const { id } = await ctx.params;
  const ok = await partnerLogoRepository.delete(id);
  return ok ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: 'Logo nenalezeno.' }, { status: 404 });
}
