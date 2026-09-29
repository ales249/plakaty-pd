import 'server-only';
import { posterInputSchema, type PosterInput } from './poster-input';

/** Kompaktní serializace vstupu do URL interní stránky /render (jen na serveru). */
export function encodeInput(input: PosterInput): string {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
}

export function decodeInput(encoded: string): PosterInput {
  return posterInputSchema.parse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));
}
