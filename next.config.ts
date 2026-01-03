import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'video.bunnycdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.b-cdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'share.zytronium.dev',
      },
      {
        protocol: 'https',
        hostname: 'bfbgxztphnbtrlplityh.supabase.co',
      },
    ],
  },
  reactCompiler: true,
};

export default nextConfig;
