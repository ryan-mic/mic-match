import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for development
  reactStrictMode: true,

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental features
  experimental: {
    turbopack: process.env.TURBOPACK === 'true',
  },

  // TypeScript strict mode
  typescript: {
    tsconfigPath: './tsconfig.json',
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'MIC Match',
  },

  // Webpack configuration for additional optimizations
  webpack: (config) => {
    config.optimization.usedExports = true;
    return config;
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
