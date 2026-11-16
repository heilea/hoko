/**
 * Lance la démo client : le site branché sur le projet Supabase de démo (« hoko-demo »).
 *
 * Lancer depuis le dossier web : npm run dev:demo, puis ouvrir http://localhost:3001
 *
 * Les variables de .env.demo sont chargées avant Next.js : elles passent devant celles de
 * .env.local, que Next.js ne remplace jamais. La démo utilise son propre dossier de travail
 * (.next-demo), elle peut donc tourner en même temps que le vrai site.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync(".env.demo")) {
  console.error("Fichier .env.demo introuvable : il contient l'adresse et la clé publique du projet de démo.");
  process.exit(1);
}
process.loadEnvFile(".env.demo");

const next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3001"], {
  stdio: "inherit",
  env: process.env,
});
next.on("exit", (code) => process.exit(code ?? 0));
