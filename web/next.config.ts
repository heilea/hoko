import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La démo client tourne à côté du vrai site, avec son propre dossier (voir .env.demo et `npm run dev:demo`)
  distDir: process.env.HOKO_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
