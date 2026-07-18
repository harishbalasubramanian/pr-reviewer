import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Prevents Next.js from incorrectly detecting a parent-directory lock file
  // as the workspace root when this project lives inside a monorepo-like structure.
  experimental: {
    outputFileTracingRoot: path.join(__dirname),
  },
};

export default nextConfig;
