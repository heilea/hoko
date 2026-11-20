/**
 * « Voir le numéro », côté serveur seulement (SPEC.md, section 4, point 7).
 *
 * Les fonctions `voir_numero_annonce` et `voir_numero_vitrine` ne sont plus ouvertes à la clé
 * publique : seul ce serveur peut les appeler, avec la clé secrète. Ainsi personne ne contourne
 * la limite de 20 numéros par heure et par visiteur, comptée par la base (`numero_demandes`).
 *
 * Ce client à clé secrète ne sert qu'à ces deux fonctions. Il n'est jamais créé dans le
 * navigateur, et la clé ne porte jamais le préfixe NEXT_PUBLIC_.
 */
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { idAnnonceValide } from "./annonces";
import type { Database } from "./database.types";
import {
  adresseClient,
  COOKIE_VISITEUR,
  creerCookieVisiteur,
  empreinte,
  lireCookieVisiteur,
  optionsCookieVisiteur,
} from "./visiteur";

export type CibleContact = { type: "annonce" | "pro"; id: string };
export type ReponseNumero = { numero: string } | { erreur: "limite" | "introuvable" | "indisponible" };

export async function demanderNumero(cible: CibleContact): Promise<ReponseNumero> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return { erreur: "indisponible" };
  if (!cible || typeof cible.id !== "string") return { erreur: "introuvable" };
  const annonce = cible.type === "annonce" && idAnnonceValide(cible.id);
  const vitrine = cible.type === "pro" && /^[a-z0-9-]{1,80}$/.test(cible.id);
  if (!annonce && !vitrine) return { erreur: "introuvable" };

  const magasin = await cookies();
  const adresse = adresseClient(await headers());
  const id = await lireCookieVisiteur(secret, magasin.get(COOKIE_VISITEUR)?.value);
  if (!id) {
    // Normalement posé par le proxy à l'ouverture de la page ; reposé ici au besoin
    magasin.set(COOKIE_VISITEUR, await creerCookieVisiteur(secret), optionsCookieVisiteur());
  }
  const visiteur = await empreinte(secret, "visiteur", id ?? `sans-cookie:${adresse}`);
  const empreinteAdresse = await empreinte(secret, "adresse", adresse);

  const supabase = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = annonce
    ? await supabase.rpc("voir_numero_annonce", { annonce_id: Number(cible.id), visiteur, adresse: empreinteAdresse })
    : await supabase.rpc("voir_numero_vitrine", { vitrine_slug: cible.id, visiteur, adresse: empreinteAdresse });
  if (error) {
    if (error.hint === "limite") return { erreur: "limite" };
    console.error("Numéro refusé par la base :", error.code);
    return { erreur: "indisponible" };
  }
  return data ? { numero: data } : { erreur: "introuvable" };
}

