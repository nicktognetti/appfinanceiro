import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse must run in Node.js runtime, not the Edge runtime
  serverExternalPackages: ['pdf-parse'],
  // Allow server actions to receive PDF uploads up to 20 MB
  serverActions: {
    bodySizeLimit: '20mb',
  },
};

export default nextConfig;
