/**
 * Règles d'affichage des annonces et des vitrines publiques. Fonctions pures, testées.
 * La lecture dans Supabase est dans `annonces-donnees.ts`.
 */
import type { Listing, Pro } from "./data";
import type { Tables } from "./database.types";

/** Les annonces se datent à l'heure de Tahiti, quel que soit le fuseau du serveur. */
const FUSEAU = "Pacific/Tahiti";

/** Longueur maximale d'une recherche : au-delà, le texte est coupé. */
export const RECHERCHE_MAX = 80;

/** Une annonce telle que la base la renvoie, avec sa catégorie et sa vitrine éventuelle. */
export type LigneListing = Pick<
  Tables<"listings">,
  "id" | "titre" | "description" | "prix_xpf" | "suffixe_prix" | "ile" | "commune" | "vendeur_nom" | "created_at" | "boost_jusqu_au" | "shop_id"
> & {
  categories: Pick<Tables<"categories">, "slug"> | null;
  shops: Pick<Tables<"shops">, "slug"> | null;
};

/** Une vitrine telle que la base la renvoie, avec sa catégorie. */
export type LigneVitrine = Pick<Tables<"shops">, "slug" | "nom" | "secteur" | "ile" | "commune" | "presentation" | "horaires"> & {
  categories: Pick<Tables<"categories">, "slug"> | null;
};

function jourATahiti(instant: number): string {
  // Format AAAA-MM-JJ, comparable comme du texte
  return new Date(instant).toLocaleDateString("en-CA", { timeZone: FUSEAU });
}

/** « aujourd'hui », « hier », « il y a 3 jours », puis la date (« le 2 novembre »). */
export function libellePublication(creeLe: string, maintenant: number): string {
  const jour = Date.parse(`${jourATahiti(Date.parse(creeLe))}T00:00:00Z`);
  const aujourdhui = Date.parse(`${jourATahiti(maintenant)}T00:00:00Z`);
  const ecart = Math.round((aujourdhui - jour) / 86_400_000);
  if (ecart <= 0) return "aujourd'hui";
  if (ecart === 1) return "hier";
  if (ecart < 7) return `il y a ${ecart} jours`;
  return `le ${new Date(creeLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: FUSEAU })}`;
}

/**
 * Met une annonce de la base au format des pages publiques.
 * Renvoie null pour une annonce pro dont la vitrine n'est pas visible (pas encore active ou
 * pas vérifiée) : elle ne doit pas apparaître comme une annonce de particulier.
 */
export function versListing(ligne: LigneListing, maintenant: number): Listing | null {
  if (ligne.shop_id && !ligne.shops) return null;
  const boostFin = ligne.boost_jusqu_au ? Date.parse(ligne.boost_jusqu_au) : NaN;
  return {
    id: String(ligne.id),
    titre: ligne.titre,
    description: ligne.description,
    prixXpf: ligne.prix_xpf,
    suffixePrix: ligne.suffixe_prix ?? undefined,
    categorie: ligne.categories?.slug ?? "",
    commune: ligne.commune,
    ile: ligne.ile,
    publiee: libellePublication(ligne.created_at, maintenant),
    // Un pro ne peut pas booster : une annonce de vitrine n'est jamais boostée
    boost: !ligne.shop_id && boostFin > maintenant,
    vendeur: ligne.vendeur_nom,
    shopId: ligne.shops?.slug,
  };
}

/** Met une vitrine de la base au format des pages publiques. */
export function versPro(ligne: LigneVitrine): Pro {
  return {
    slug: ligne.slug,
    nom: ligne.nom,
    secteur: ligne.secteur,
    ile: ligne.ile,
    categorie: ligne.categories?.slug ?? "",
    commune: ligne.commune,
    presentation: ligne.presentation,
    horaires: ligne.horaires,
  };
}

/** Annonces boostées en tête, les autres gardent leur ordre (les plus récentes d'abord). */
export function trierParBoost(annonces: Listing[]): Listing[] {
  return [...annonces.filter((a) => a.boost), ...annonces.filter((a) => !a.boost)];
}

/** Pros d'un secteur ; s'il n'y en a aucun, tout l'annuaire, pour ne jamais montrer un bloc vide. */
export function prosDuSecteur(pros: Pro[], categorie?: string): Pro[] {
  if (!categorie) return pros;
  const duSecteur = pros.filter((pro) => pro.categorie === categorie);
  return duSecteur.length > 0 ? duSecteur : pros;
}

/**
 * Autres annonces à proposer sous une annonce de particulier : d'abord celles de la même
 * catégorie, puis les plus récentes, sans l'annonce affichée ni doublon.
 */
export function autresAnnonces(annonce: Listing, memeCategorie: Listing[], recentes: Listing[], max = 3): Listing[] {
  const vues = new Set([annonce.id]);
  const resultat: Listing[] = [];
  for (const autre of [...memeCategorie, ...recentes]) {
    if (resultat.length >= max) break;
    if (vues.has(autre.id) || autre.shopId) continue;
    vues.add(autre.id);
    resultat.push(autre);
  }
  return resultat;
}

/** Nettoie le texte cherché : sans espaces autour, raccourci. Renvoie "" s'il n'y a rien à chercher. */
export function nettoyerRecherche(q: string | undefined): string {
  return (q ?? "").trim().replace(/\s+/g, " ").slice(0, RECHERCHE_MAX);
}

/** Un identifiant d'annonce valide : un nombre entier positif écrit en chiffres. */
export function idAnnonceValide(id: string): boolean {
  return /^[1-9]\d{0,17}$/.test(id) && Number.isSafeInteger(Number(id));
}
