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
    ],
  },
  reactCompiler: true,
};

export default nextConfig;
