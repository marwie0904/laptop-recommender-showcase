import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export (spec §1). Cache Components (and partialPrefetching, which needs it) is off:
  // Next can't export with PPR (spike S4, 2026-10-11).
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
