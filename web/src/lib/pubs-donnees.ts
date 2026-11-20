/**
 * Lecture des espaces pub dans Supabase (SPEC.md, section 3 ter).
 *
 * Le public ne lit que les pubs en place (règle d'accès de `ad_slots`) : lecture avec la clé
 * publique, mise en cache quelques minutes, vidée quand l'administrateur décide (`TAG_PUBS`).
 * L'administrateur lit tout avec sa session (`getPubsAdmin`).
 */
import { cacheLife, cacheTag } from "next/cache";
import { dateCourte } from "./accounts";
import { categories } from "./data";
import { adressePhoto } from "./photos";
import { etatPub, type PubAffichee } from "./pubs";
import { getSupabase } from "./supabase";
import { creerClientServeur } from "./supabase-serveur";

export const TAG_PUBS = "pubs";

/** Pubs en place : celle de l'accueil, et celle de chaque catégorie (par slug). */
export type PubsEnPlace = { accueil?: PubAffichee & { finLe: string }; categories: Record<string, PubAffichee & { finLe: string }> };

export async function getPubsEnPlace(): Promise<PubsEnPlace> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAG_PUBS);
  const resultat: PubsEnPlace = { categories: {} };
  const supabase = getSupabase();
  if (!supabase) return resultat;
  const { data } = await supabase
    .from("ad_slots")
    .select("emplacement, annonceur, lien, visuel, fin, categories(slug)")
    .eq("statut", "actif")
    .gt("fin", new Date().toISOString());
  for (const ligne of data ?? []) {
    if (!ligne.visuel || !ligne.lien || !ligne.fin) continue;
    const pub = { annonceur: ligne.annonceur, lien: ligne.lien, image: adressePhoto(ligne.visuel), finLe: dateCourte(ligne.fin) };
    if (ligne.emplacement === "accueil") resultat.accueil = pub;
    else if (ligne.categories?.slug) resultat.categories[ligne.categories.slug] = pub;
  }
  return resultat;
}

/** Prix en vigueur, lus dans la base (table `pub_tarifs`), modifiables depuis le tableau de bord. */
export async function getPubTarifs(): Promise<{ accueil: number | null; categorie: number | null }> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_PUBS);
  const supabase = getSupabase();
  if (!supabase) return { accueil: null, categorie: null };
  const { data } = await supabase.from("pub_tarifs").select("emplacement, prix_xpf");
  const prix = (emplacement: string) => data?.find((t) => t.emplacement === emplacement)?.prix_xpf ?? null;
  return { accueil: prix("accueil"), categorie: prix("categorie") };
}

/** Une pub vue par l'administrateur. */
export type PubAdmin = {
  id: number;
  emplacement: string;
  categorie: string | null;
  annonceur: string;
  lien: string | null;
  image: string | null;
  montantXpf: number;
  etat: ReturnType<typeof etatPub>;
  creeeLe: string;
  finLe: string | null;
};

/** Toutes les pubs, les plus récentes d'abord. À n'appeler qu'après avoir vérifié le rôle. */
export async function getPubsAdmin(): Promise<PubAdmin[]> {
  const supabase = await creerClientServeur();
  if (!supabase) return [];
  const { data } = await supabase
    .from("ad_slots")
    .select("id, emplacement, annonceur, lien, visuel, montant_xpf, statut, fin, created_at, categories(slug)")
    .order("created_at", { ascending: false })
    .limit(200);
  const maintenant = Date.now();
  return (data ?? []).map((ligne) => ({
    id: ligne.id,
    emplacement: ligne.emplacement,
    categorie: categories.find((c) => c.slug === ligne.categories?.slug)?.nom ?? null,
    annonceur: ligne.annonceur,
    lien: ligne.lien,
    image: ligne.visuel ? adressePhoto(ligne.visuel) : null,
    montantXpf: ligne.montant_xpf,
    etat: etatPub(ligne.statut, ligne.fin, maintenant),
    creeeLe: dateCourte(ligne.created_at),
    finLe: ligne.fin ? dateCourte(ligne.fin) : null,
  }));
}
