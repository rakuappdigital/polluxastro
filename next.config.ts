import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  experimental: {
    optimizePackageImports: ["date-fns", "framer-motion", "lucide-react"],
  },
};

export default nextConfig;
