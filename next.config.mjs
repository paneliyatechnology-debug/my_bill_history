import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {(phase: string) => import('next').NextConfig} */
export default function (phase) {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    reactStrictMode: true,
    distDir: isDev ? '.next-dev' : '.next',
    allowedDevOrigins: [
      '192.168.*.*',
      '10.*.*.*',
      '172.16.*.*',
      '172.17.*.*',
      '172.18.*.*',
      '172.19.*.*',
      '172.2*.*.*',
      '172.3*.*.*',
      'localhost',
      '127.0.0.1',
      '*.local',
    ],
    async rewrites() {
      // In production on Vercel, forward to Render backend if defined in either variable
      const rawTarget =
        process.env.API_INTERNAL_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:4000/api/v1';

      // Normalize target so it ends with /:path*
      const baseClean = rawTarget.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
      const destination = `${baseClean}/api/v1/:path*`;

      return [
        {
          source: '/api/v1/:path*',
          destination,
        },
      ];
    },
  };
}

