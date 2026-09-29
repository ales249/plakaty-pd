import 'server-only';
import { localPartnerLogoRepository } from './local/partner-logo-repository';
import { photoCatalog } from './local/photo-catalog';
import type { PartnerLogoRepository, PhotoRepository } from './ports';

/** Jediné místo, kde se volí implementace úložiště. */
export const photoRepository: PhotoRepository = photoCatalog;
export const partnerLogoRepository: PartnerLogoRepository = localPartnerLogoRepository;
