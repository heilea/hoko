/**
 * Lecture, dans Supabase, de ce que l'annonceur connecté voit dans son espace.
 * Les règles d'accès de la base ne laissent lire que ses propres annonces et sa vitrine.
 *
 * À n'appeler que côté serveur, après getSession().
 */
import { lireStatutVitrine, versSuivi, type Account, type AccountListing, type Vitrine } from "./accounts";
import { MAX_ANNONCES_PRO } from "./data";
import { creerClientServeur } from "./supabase-serveur";

/** Les annonces du compte, les plus récentes d'abord. */
export async function getAccountListings(compte: Account): Promise<AccountListing[]> {
  const supabase = await creerClientServeur();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("id, titre, prix_xpf, statut, boost_jusqu_au, motif_refus, categories(slug)")
    .eq("user_id", compte.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  // L'heure courante dit si un boost est encore actif (la requête est déjà attendue, voir creerClientServeur)
  const maintenant = Date.now();
  return data.map((ligne) => versSuivi(ligne, maintenant));
}

/** La vitrine du pro, ou null pour un particulier. */
export async function getVitrine(compte: Account): Promise<Vitrine | null> {
  if (compte.type !== "pro") return null;
  const supabase = await creerClientServeur();
  if (!supabase) return null;

  const { data: vitrine } = await supabase
    .from("shops")
    .select("id, slug, nom, secteur, ile, commune, presentation, horaires, verifie, statut")
    .eq("user_id", compte.id)
    .maybeSingle();
  if (!vitrine) return null;

  const { count } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", vitrine.id)
    .eq("statut", "active");

  return {
    slug: vitrine.slug,
    nom: vitrine.nom,
    secteur: vitrine.secteur,
    ile: vitrine.ile,
    commune: vitrine.commune,
    presentation: vitrine.presentation,
    horaires: vitrine.horaires,
    verifie: Boolean(vitrine.verifie),
    statut: lireStatutVitrine(vitrine.statut),
    annonces: count ?? 0,
    maximum: MAX_ANNONCES_PRO,
  };
}
