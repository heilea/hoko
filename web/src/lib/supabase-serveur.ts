/**
 * Client Supabase côté serveur, qui agit au nom de l'annonceur connecté.
 *
 * La session Supabase vit dans des cookies (préfixe `sb-`). Ce client les lit et, dans une
 * action serveur ou une route, les réécrit (connexion, déconnexion, renouvellement).
 * Dans un composant serveur, l'écriture est impossible : c'est `src/proxy.ts` qui renouvelle
 * la session avant l'affichage.
 *
 * À n'appeler que côté serveur.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

export async function creerClientServeur() {
  // Les cookies sont lus en premier, avant tout retour : c'est cette lecture qui indique à
  // Next.js que la page dépend de la requête (sinon elle serait figée à la construction).
  const magasin = await cookies();
  // Supabase lit l'heure courante (expiration du jeton). Sans cette attente, Next.js signale
  // « unstable value Date.now() » quand il prérend une page qui lit seulement les cookies.
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !cle) return null;

  return createServerClient(url, cle, {
    cookies: {
      getAll: () => magasin.getAll(),
      setAll(aEcrire) {
        try {
          for (const { name, value, options } of aEcrire) magasin.set(name, value, options);
        } catch {
          // Appel depuis un composant serveur : les cookies y sont en lecture seule.
          // Sans conséquence, le proxy renouvelle la session à la requête suivante.
        }
      },
    },
  });
}

/**
 * Adresse publique du site, utilisée dans les liens envoyés par e-mail (confirmation,
 * nouveau mot de passe). Obligatoire en production (variable SITE_URL).
 */
export function adresseDuSite(): string | null {
  const adresse = process.env.SITE_URL?.replace(/\/+$/, "");
  if (adresse) return adresse;
  return process.env.NODE_ENV === "production" ? null : "http://localhost:3000";
}
