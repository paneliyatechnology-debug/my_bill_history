import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {(phase: string) => import('next').NextConfig} */
export default function (phase) {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,
    transpilePackages: ['@billing/shared-types'],
    distDir: isDev ? '.next-dev' : '.next',
    async rewrites() {
      return [
        {
          source: '/api/v1/:path*',
          destination: process.env.API_INTERNAL_URL || 'http://localhost:4000/api/v1/:path*',
        },
      ];
    },
  };
}

