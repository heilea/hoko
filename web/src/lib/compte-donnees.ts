/**
 * Lecture, dans Supabase, de ce que l'annonceur connecté voit dans son espace.
 * Les règles d'accès de la base ne laissent lire que ses propres annonces et sa vitrine.
 *
 * À n'appeler que côté serveur, après getSession().
 */
import { lireStatutVitrine, versSuivi, type Account, type AccountListing, type Vitrine } from "./accounts";
import { MAX_ANNONCES_PRO } from "./data";
import type { AnnonceSaisie } from "./validation";
import { creerClientServeur } from "./supabase-serveur";

/** Les annonces du compte, les plus récentes d'abord. */
export async function getAccountListings(compte: Account): Promise<AccountListing[]> {
  const supabase = await creerClientServeur();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("id, titre, prix_xpf, statut, boost_jusqu_au, motif_refus, expire_le, categories(slug)")
    .eq("user_id", compte.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  // L'heure courante dit si un boost est encore actif (la requête est déjà attendue, voir creerClientServeur)
  const maintenant = Date.now();
  return data.map((ligne) => versSuivi(ligne, maintenant));
}

/**
 * Une annonce du compte, avec son contenu, pour le formulaire « Modifier ».
 * Les règles d'accès de la base ne renvoient que les annonces du compte connecté.
 */
export async function getAnnoncePourModifier(compte: Account, id: string): Promise<{ id: string; saisie: AnnonceSaisie } | null> {
  if (!/^[1-9]\d{0,17}$/.test(id)) return null;
  const supabase = await creerClientServeur();
  if (!supabase) return null;
  const { data } = await supabase
    .from("listings")
    .select("id, titre, description, prix_xpf, ile, commune, categories(slug)")
    .eq("id", Number(id))
    .eq("user_id", compte.id)
    .is("shop_id", null)
    .maybeSingle();
  if (!data) return null;
  return {
    id: String(data.id),
    saisie: {
      titre: data.titre,
      categorie: data.categories?.slug ?? "",
      prix: String(data.prix_xpf),
      description: data.description,
      ile: data.ile,
      commune: data.commune,
      // Le vendeur confirme de nouveau l'affichage de son numéro à chaque envoi
      accord: false,
    },
  };
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
