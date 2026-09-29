import { connection } from 'next/server';
import { partnerLogoRepository, photoRepository } from '@/data';
import { Generator } from './generator';

export default async function Home() {
  await connection();
  const [photos, logos] = await Promise.all([photoRepository.list(), partnerLogoRepository.list()]);
  return <Generator initialPhotos={photos} initialLogos={logos} />;
}
