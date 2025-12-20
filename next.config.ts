import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true, // Next.js 16: Partial Prerendering
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
};

export default nextConfig;
