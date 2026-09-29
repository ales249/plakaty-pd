import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Nasazení pod podadresou webu, např. NEXT_PUBLIC_BASE_PATH=/plakaty (nastavuje se při buildu)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  // Indikátor dev režimu by se jinak vyfotil do exportu
  devIndicators: false,
};

export default nextConfig;
