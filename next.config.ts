import type { NextConfig } from "next";
import { fileURLToPath } from 'node:url';

const nextConfig: NextConfig = {
  experimental: { cpus: 1 },
  serverExternalPackages: ['postgres'],
  turbopack: { resolveAlias: { '@montra/runtime': './montra/runtime-vercel.ts' } },
  webpack(config) { config.resolve.alias['@montra/runtime'] = fileURLToPath(new URL('./montra/runtime-vercel.ts', import.meta.url)); return config; },
};

export default nextConfig;
