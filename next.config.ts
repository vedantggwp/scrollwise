import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist optionally requires Node "canvas"; we only use it in browser. Stub it so build succeeds.
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.fallback = { ...config.resolve.fallback, canvas: false };
    return config;
  },
};

export default nextConfig;
