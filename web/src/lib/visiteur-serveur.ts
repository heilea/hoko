/**
 * Côté serveur seulement : le client Supabase à clé secrète et les empreintes du visiteur,
 * partagés par « Voir le numéro » (`@/lib/numeros`) et « Signaler » (`@/lib/signaler`).
 *
 * Ce client ne sert qu'aux fonctions de la base réservées au serveur (`voir_numero_*`,
 * `signaler_annonce`). Il n'est jamais créé dans le navigateur, et la clé ne porte jamais le
 * préfixe NEXT_PUBLIC_.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import type { Database } from "./database.types";
import {
  adresseClient,
  COOKIE_VISITEUR,
  creerCookieVisiteur,
  empreinte,
  lireCookieVisiteur,
  optionsCookieVisiteur,
} from "./visiteur";

export type ServeurVisiteur = {
  supabase: SupabaseClient<Database>;
  /** Empreintes (HMAC) du visiteur et de son adresse IP : jamais les valeurs en clair. */
  visiteur: string;
  adresse: string;
};

/** Prépare l'appel à la base pour le visiteur en cours. Null si le serveur n'est pas configuré. */
export async function serveurVisiteur(): Promise<ServeurVisiteur | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;

  const magasin = await cookies();
  const adresse = adresseClient(await headers());
  const id = await lireCookieVisiteur(secret, magasin.get(COOKIE_VISITEUR)?.value);
  if (!id) {
    // Normalement posé par le proxy à l'ouverture de la page ; reposé ici au besoin
    magasin.set(COOKIE_VISITEUR, await creerCookieVisiteur(secret), optionsCookieVisiteur());
  }
  return {
    supabase: createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }),
    visiteur: await empreinte(secret, "visiteur", id ?? `sans-cookie:${adresse}`),
    adresse: await empreinte(secret, "adresse", adresse),
  };
}
