import type { NextConfig } from "next";

const buildSha = process.env.VERCEL_GIT_COMMIT_SHA
  ?? process.env.GITHUB_SHA
  ?? process.env.BLOCKWILD_BUILD_SHA
  ?? "local";

const nextConfig: NextConfig = {
  // Isolated local verification may retain its own output without overwriting
  // a previously verified .next artifact. Production keeps the default path.
  ...(process.env.BLOCKWILD_NEXT_DIST_DIR?.startsWith("work/")
    && !process.env.BLOCKWILD_NEXT_DIST_DIR.split(/[\\/]/).includes("..")
    ? { distDir: process.env.BLOCKWILD_NEXT_DIST_DIR } : {}),
  env: {
    NEXT_PUBLIC_BLOCKWILD_BUILD_SHA: buildSha,
  },
};

export default nextConfig;
