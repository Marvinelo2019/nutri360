import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Logo files are capped at 2 MB; multipart form metadata needs headroom.
      bodySizeLimit: "3mb",
    },
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
