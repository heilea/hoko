/**
 * Lecture, dans Supabase, de ce que l'annonceur connecté voit dans son espace.
 * Les règles d'accès de la base ne laissent lire que ses propres annonces et sa vitrine.
 *
 * À n'appeler que côté serveur, après getSession().
 */
import { dateCourte, lireStatutVitrine, versSuivi, type Account, type AccountListing, type Vitrine } from "./accounts";
import { MAX_ANNONCES_PRO } from "./data";
import { versPhotos, type Photo } from "./photos";
import type { AnnonceSaisie } from "./validation";
import { creerClientServeur } from "./supabase-serveur";

/** Les annonces du compte, les plus récentes d'abord. */
export async function getAccountListings(compte: Account): Promise<AccountListing[]> {
  const supabase = await creerClientServeur();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("id, titre, prix_xpf, statut, boost_jusqu_au, motif_refus, expire_le, categories(slug), contact_reveals(count), boosts(statut)")
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
export async function getAnnoncePourModifier(
  compte: Account,
  id: string,
): Promise<{ id: string; saisie: AnnonceSaisie; photos: Photo[] } | null> {
  if (!/^[1-9]\d{0,17}$/.test(id)) return null;
  const supabase = await creerClientServeur();
  if (!supabase) return null;
  const { data } = await supabase
    .from("listings")
    .select("id, titre, description, prix_xpf, ile, commune, categories(slug), photos(id, chemin, ordre)")
    .eq("id", Number(id))
    .eq("user_id", compte.id)
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
    photos: versPhotos(data.photos),
  };
}

/** Ce que voit le particulier sur la page « Booster » d'une de ses annonces. */
export type EtatBoostAnnonce = {
  id: string;
  titre: string;
  enLigne: boolean;
  prixXpf: number;
  placesPrises: number;
  places: number;
  /** Prochaine place libre (« 24 novembre »), si les places sont prises par des boosts actifs. */
  libreLe?: string;
  /** Boost en cours ou en attente sur cette annonce. */
  commande?: { id: number; statut: "en_attente_paiement" | "actif"; finLe?: string; montantXpf: number };
};

/** Annonce du compte et état du boost dans sa catégorie (fonction `etat_boost` de la base). */
export async function getEtatBoost(compte: Account, id: string): Promise<EtatBoostAnnonce | null> {
  if (!/^[1-9]\d{0,17}$/.test(id)) return null;
  const supabase = await creerClientServeur();
  if (!supabase) return null;
  const [{ data: annonce }, { data: etat }] = await Promise.all([
    supabase.from("listings").select("id, titre, statut, expire_le, shop_id").eq("id", Number(id)).eq("user_id", compte.id).maybeSingle(),
    supabase.rpc("etat_boost", { annonce_id: Number(id) }),
  ]);
  const e = etat?.[0];
  if (!annonce || annonce.shop_id || !e) return null;
  // La requête est déjà attendue (voir creerClientServeur) : l'heure courante peut être lue
  const enLigne = annonce.statut === "active" && (!annonce.expire_le || Date.parse(annonce.expire_le) > Date.now());
  return {
    id: String(annonce.id),
    titre: annonce.titre,
    enLigne,
    prixXpf: e.prix_xpf,
    placesPrises: e.places_prises,
    places: e.places,
    libreLe: e.libre_le ? dateCourte(e.libre_le) : undefined,
    commande: e.commande_id
      ? {
          id: e.commande_id,
          statut: e.commande_statut === "actif" ? "actif" : "en_attente_paiement",
          finLe: e.commande_fin ? dateCourte(e.commande_fin) : undefined,
          montantXpf: e.commande_montant,
        }
      : undefined,
  };
}

/** La vitrine du pro, ou null pour un particulier. */
export async function getVitrine(compte: Account): Promise<Vitrine | null> {
  if (compte.type !== "pro") return null;
  const supabase = await creerClientServeur();
  if (!supabase) return null;

  const { data: vitrine } = await supabase
    .from("shops")
    .select("id, slug, nom, secteur, ile, commune, presentation, horaires, verifie, statut, categories(slug)")
    .eq("user_id", compte.id)
    .maybeSingle();
  if (!vitrine) return null;

  const [{ count }, { count: contacts }] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("shop_id", vitrine.id).eq("statut", "active"),
    // Clics sur « Voir le numéro » de la page de la vitrine (ceux des annonces sont comptés à part)
    supabase.from("contact_reveals").select("id", { count: "exact", head: true }).eq("shop_id", vitrine.id),
  ]);

  return {
    id: vitrine.id,
    slug: vitrine.slug,
    nom: vitrine.nom,
    secteur: vitrine.secteur,
    categorie: vitrine.categories?.slug ?? "",
    ile: vitrine.ile,
    commune: vitrine.commune,
    presentation: vitrine.presentation,
    horaires: vitrine.horaires,
    verifie: Boolean(vitrine.verifie),
    statut: lireStatutVitrine(vitrine.statut),
    annonces: count ?? 0,
    contacts: contacts ?? 0,
    maximum: MAX_ANNONCES_PRO,
  };
}
