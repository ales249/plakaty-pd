import { connection } from 'next/server';
import { photoRepository } from '@/data';
import { Generator } from './generator';

export default async function Home() {
  await connection();
  const photos = await photoRepository.list();
  return <Generator initialPhotos={photos} />;
}
