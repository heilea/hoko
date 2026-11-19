/**
 * Lecture, dans Supabase, de ce que voit l'administrateur.
 * Les règles d'accès de la base ne montrent toutes les annonces qu'à un administrateur :
 * appelée par un autre compte, la file ne contiendrait que ses propres annonces.
 *
 * À n'appeler que côté serveur, après avoir vérifié le rôle avec getSession().
 */
import { lireStatutVitrine, type StatutVitrine } from "./accounts";
import type { LigneAModerer } from "./moderation";
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
