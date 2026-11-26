/**
 * Lecture, dans Supabase, de ce que voit l'administrateur.
 * Les règles d'accès de la base ne montrent toutes les annonces qu'à un administrateur :
 * appelée par un autre compte, la file ne contiendrait que ses propres annonces.
 *
 * À n'appeler que côté serveur, après avoir vérifié le rôle avec getSession().
 */
import { dateCourte, lireStatutVitrine, type StatutVitrine } from "./accounts";
import type { LigneAModerer } from "./moderation";
import { regrouperSignalements, type AnnonceSignalee } from "./signalements";
import { creerClientServeur } from "./supabase-serveur";

/** Une vitrine vue par l'administrateur, avec les coordonnées privées du compte. */
export type VitrineAdmin = {
  id: string;
  slug: string;
  nom: string;
  secteur: string;
  lieu: string;
  statut: StatutVitrine;
  verifie: boolean;
  numeroTahiti: string;
  telephone: string;
  /** Pour demander les documents de la DICP. Jamais affiché ailleurs que dans l'administration. */
  email: string;
  annoncesEnLigne: number;
  creeeLe: string;
};

/**
 * Toutes les vitrines, celles en attente de paiement d'abord. La fonction `vitrines_admin` de
 * la base refuse tout compte qui n'est pas administrateur.
 */
export async function getVitrinesAdmin(): Promise<VitrineAdmin[]> {
  const supabase = await creerClientServeur();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("vitrines_admin");
  if (error || !data) return [];
  return data.map((v) => ({
    id: v.id,
    slug: v.slug,
    nom: v.nom,
    secteur: v.secteur,
    lieu: `${v.commune}, ${v.ile}`,
    statut: lireStatutVitrine(v.statut),
    verifie: v.verifie,
    numeroTahiti: v.numero_tahiti ?? "—",
    telephone: v.telephone ?? "—",
    email: v.email ?? "—",
    annoncesEnLigne: v.annonces_en_ligne,
    creeeLe: v.creee_le,
  }));
}

/** Un boost vu par l'administrateur : commande en attente de paiement, ou boost actif. */
export type BoostAdmin = {
  id: number;
  statut: "en_attente_paiement" | "actif";
  montantXpf: number;
  finLe?: string;
  commandeLe: string;
  annonceId: number;
  titre: string;
  annonceEnLigne: boolean;
  categorie: string;
  vendeur: string;
  telephone: string;
  /** Pour contacter le particulier au sujet du paiement. Jamais affiché ailleurs. */
  email: string;
};

/** Commandes en attente (les plus anciennes d'abord), puis boosts actifs. La base vérifie le rôle. */
export async function getBoostsAdmin(): Promise<BoostAdmin[]> {
  const supabase = await creerClientServeur();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("boosts_admin");
  if (error || !data) return [];
  return data.map((b) => ({
    id: b.id,
    statut: b.statut === "actif" ? "actif" : "en_attente_paiement",
    montantXpf: b.montant_xpf,
    finLe: b.fin ? dateCourte(b.fin) : undefined,
    commandeLe: dateCourte(b.commande_le),
    annonceId: b.annonce_id,
    titre: b.titre,
    annonceEnLigne: b.annonce_statut === "active",
    categorie: b.categorie,
    vendeur: b.vendeur,
    telephone: b.telephone ?? "—",
    email: b.email ?? "—",
  }));
}

/** Nombre d'annonces affichées à la fois dans la file. */
export const TAILLE_FILE = 50;

/**
 * Les annonces en attente de validation, les plus anciennes d'abord.
 * `maintenant` : heure de la lecture, pour dire depuis combien de temps chaque annonce attend.
 */
export async function getAnnoncesEnAttente(): Promise<{ annonces: LigneAModerer[]; total: number; maintenant: number }> {
  const supabase = await creerClientServeur();
  if (!supabase) return { annonces: [], total: 0, maintenant: 0 };
  const { data, count, error } = await supabase
    .from("listings")
    .select("id, titre, description, prix_xpf, suffixe_prix, ile, commune, vendeur_nom, created_at, categories(slug, nom), photos(id, chemin, ordre)", {
      count: "exact",
    })
    .eq("statut", "en_attente_validation")
    .order("created_at", { ascending: true })
    .limit(TAILLE_FILE);
  if (error || !data) return { annonces: [], total: 0, maintenant: 0 };
  // La requête est déjà attendue (voir creerClientServeur) : l'heure courante peut être lue
  return { annonces: data, total: count ?? data.length, maintenant: Date.now() };
}

/**
 * Signalements ouverts, regroupés par annonce, les plus signalées d'abord (SPEC.md, 4 septies).
 * La règle d'accès de `signalements` ne montre rien à un autre compte que l'administrateur.
 */
export async function getSignalementsOuverts(): Promise<AnnonceSignalee[]> {
  const supabase = await creerClientServeur();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("signalements")
    .select("listing_id, motif, details, created_at, listings(titre, vendeur_nom, statut, expire_le)")
    .eq("statut", "ouvert")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) return [];
  return regrouperSignalements(data, Date.now());
}
