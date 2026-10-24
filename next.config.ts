import type { NextConfig } from "next";
import path from "node:path";

const isProd = process.env.NODE_ENV === 'production';
const repoName = process.env.REPO_NAME || 'congklak-project-game';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}/` : '',
  images: {
    unoptimized: true,
  },
  // A stray package-lock.json in the home folder made Next guess the wrong root.
  turbopack: {
    root: path.resolve(__dirname),
  },
  agentRules: false,
};

export default nextConfig;
