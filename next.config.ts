import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['canvas', '@napi-rs/canvas', 'pdfjs-dist'],
};

export default nextConfig;
