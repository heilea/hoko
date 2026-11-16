/**
 * Session de l'annonceur connecté, gérée par Supabase Auth.
 * À n'appeler que côté serveur, sous un <Suspense> (la lecture des cookies se fait à la requête).
 */
import { cache } from "react";
import type { Account } from "./accounts";
import { supabaseConfigure } from "./supabase";
import { creerClientServeur } from "./supabase-serveur";

export function connexionDisponible(): boolean {
  return supabaseConfigure();
}

/**
 * Le compte connecté, ou null. Mis en cache le temps d'une requête : l'en-tête, la mise en
 * page et la page peuvent l'appeler sans multiplier les appels à Supabase.
 */
export const getSession = cache(async (): Promise<Account | null> => {
  // Les cookies sont lus ici en premier (voir creerClientServeur)
  const supabase = await creerClientServeur();
  if (!supabase) return null;

  // Vérifie la signature du jeton : on ne se fie jamais au contenu brut du cookie
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  // Les règles d'accès ne laissent lire que son propre profil
  const { data: profil } = await supabase.from("profiles").select("role, nom, telephone").eq("id", claims.sub).maybeSingle();
  if (!profil) return null;

  const type = profil.role === "pro" ? "pro" : "particulier";
  let shopId: string | undefined;
  if (type === "pro") {
    const { data: vitrine } = await supabase.from("shops").select("slug").eq("user_id", claims.sub).maybeSingle();
    shopId = vitrine?.slug ?? undefined;
  }

  return {
    id: claims.sub,
    type,
    nom: profil.nom,
    email: typeof claims.email === "string" ? claims.email : "",
    telephone: profil.telephone,
    shopId,
    admin: profil.role === "admin",
  };
});

export async function fermerSession(): Promise<void> {
  const supabase = await creerClientServeur();
  await supabase?.auth.signOut();
}
