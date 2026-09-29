import { NextResponse, type NextRequest } from 'next/server';
import { photoRepository } from '@/data';

export async function GET(request: NextRequest, ctx: RouteContext<'/api/photos/[id]'>) {
  const { id } = await ctx.params;
  const variant = request.nextUrl.searchParams.get('v') === 'full' ? 'full' : 'preview';
  const file = await photoRepository.readVariant(id, variant);
  if (!file) return new NextResponse('Nenalezeno', { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: { 'Content-Type': file.contentType, 'Cache-Control': 'private, max-age=31536000, immutable' },
  });
}
