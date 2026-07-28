import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    memoryBasedWorkersCount: true,
  },
};

export default nextConfig;
