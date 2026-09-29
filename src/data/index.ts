import 'server-only';
import { photoCatalog } from './local/photo-catalog';
import type { PhotoRepository } from './ports';

/** Jediné místo, kde se volí implementace úložiště. */
export const photoRepository: PhotoRepository = photoCatalog;
