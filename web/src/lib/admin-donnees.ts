/**
 * Lecture, dans Supabase, de ce que voit l'administrateur.
 * Les règles d'accès de la base ne montrent toutes les annonces qu'à un administrateur :
 * appelée par un autre compte, la file ne contiendrait que ses propres annonces.
 *
 * À n'appeler que côté serveur, après avoir vérifié le rôle avec getSession().
 */
import type { LigneAModerer } from "./moderation";
import { creerClientServeur } from "./supabase-serveur";

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
    .select("id, titre, description, prix_xpf, suffixe_prix, ile, commune, vendeur_nom, created_at, categories(slug, nom)", {
      count: "exact",
    })
    .eq("statut", "en_attente_validation")
    .order("created_at", { ascending: true })
    .limit(TAILLE_FILE);
  if (error || !data) return { annonces: [], total: 0, maintenant: 0 };
  // La requête est déjà attendue (voir creerClientServeur) : l'heure courante peut être lue
  return { annonces: data, total: count ?? data.length, maintenant: Date.now() };
}
