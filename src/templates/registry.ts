import type { FormatId } from '@/domain/formats';
import { TEMPLATE_ID as EVENT_CLASSIC } from './event-classic/spec';

export interface TemplateInfo {
  id: string;
  name: string;
  formats: FormatId[];
}

/** Schválené šablony. Pořadatel si může vybrat jen z nich. */
export const TEMPLATES: TemplateInfo[] = [
  { id: EVENT_CLASSIC, name: 'Beseda — klasická', formats: ['poster-3x4'] },
];
