/**
 * Jeton de session signé, rangé dans un cookie.
 * Format : « identifiant.expiration.signature ». La signature (HMAC-SHA256) empêche de
 * fabriquer ou de modifier un jeton sans connaître le secret du serveur.
 * Fonctions pures, couvertes par les tests.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** Durée d'une session : 7 jours. */
export const DUREE_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function signer(contenu: string, secret: string): string {
  return createHmac("sha256", secret).update(contenu).digest("base64url");
}

export function creerJeton(compteId: string, secret: string, maintenant: number): string {
  const contenu = `${compteId}.${maintenant + DUREE_SESSION_MS}`;
  return `${contenu}.${signer(contenu, secret)}`;
}

/** Renvoie l'identifiant du compte si le jeton est authentique et non expiré, sinon null. */
export function lireJeton(jeton: string | undefined, secret: string, maintenant: number): string | null {
  if (!jeton) return null;
  const parties = jeton.split(".");
  if (parties.length !== 3) return null;
  const [compteId, expiration, signature] = parties;
  const attendue = Buffer.from(signer(`${compteId}.${expiration}`, secret));
  const recue = Buffer.from(signature);
  if (attendue.length !== recue.length || !timingSafeEqual(attendue, recue)) return null;
  const fin = Number(expiration);
  if (!Number.isFinite(fin) || fin <= maintenant) return null;
  return compteId || null;
}
