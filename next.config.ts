import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  reactStrictMode: true,
  experimental: {
    viewTransition: true,
    turbopackFileSystemCacheForDev: true,
    inlineCss: true,
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
      'framer-motion',
      '@ai-sdk/react',
    ],
  },
  images: {
    remotePatterns: [
      { hostname: 'avatar.vercel.sh' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
