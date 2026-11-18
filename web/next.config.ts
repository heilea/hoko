import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La démo client tourne à côté du vrai site, avec son propre dossier (voir .env.demo et `npm run dev:demo`)
  distDir: process.env.HOKO_DIST_DIR || ".next",
  // En développement seulement : ouvrir le site depuis un téléphone du même réseau Wi-Fi
  // (adresse locale du PC, par exemple http://192.168.1.20:3000)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Une photo (4 Mo au plus) par envoi, plus l'enveloppe du formulaire. Vercel refuse
      // de toute façon les requêtes de plus de 4,5 Mo.
      bodySizeLimit: "4.4mb",
    },
  },
};

export default nextConfig;
