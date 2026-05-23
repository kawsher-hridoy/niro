import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev requests from 127.0.0.1 (same host, different form than "localhost").
  // Next.js 16 blocks non-localhost origins for dev resources by default.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
