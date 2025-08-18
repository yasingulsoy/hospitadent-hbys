import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Üretim build'inde ESLint hatalarında durma; uyarı olarak geç
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
