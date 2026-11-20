/**
 * Pagination des listes d'annonces (SPEC.md, section 4 bis) : pages numérotées dans l'adresse
 * (`?page=2`), pas de défilement infini. Seules les annonces de la page demandée sont lues.
 */

/** Page d'une catégorie : 20 annonces, plus les boostées en tête de la page 1. */
export const PAR_PAGE_CATEGORIE = 20;
/** Accueil et recherche : 12 annonces (une grille de 2, 3 ou 4 colonnes reste pleine). */
export const PAR_PAGE_ACCUEIL = 12;
/** Au-delà, l'adresse est fantaisiste : inutile de demander la base. */
const PAGE_MAX = 10_000;

/** Numéro de page lu dans l'adresse : tout ce qui n'est pas un entier positif vaut 1. */
export function lirePage(valeur: string | string[] | undefined): number {
  const texte = Array.isArray(valeur) ? valeur[0] : valeur;
  if (typeof texte !== "string" || !/^\d{1,6}$/.test(texte)) return 1;
  const page = Number(texte);
  return page >= 1 && page <= PAGE_MAX ? page : 1;
}

/** Nombre de pages : 1 au moins, pour qu'une liste vide garde sa page. */
export function nombrePages(total: number, parPage: number): number {
  return Math.max(1, Math.ceil(total / parPage));
}

/** Rangs de la première et de la dernière annonce de la page, comme `range()` de Supabase. */
export function bornes(page: number, parPage: number): { debut: number; fin: number } {
  const debut = (page - 1) * parPage;
  return { debut, fin: debut + parPage - 1 };
}

/**
 * Numéros à afficher sous la liste : la première, la dernière, et deux voisines de la page en
 * cours ; « … » à la place des trous. Exemple pour 5 sur 12 : 1 … 4 5 6 … 12.
 */
export function numerosAffiches(page: number, pages: number): (number | "…")[] {
  const gardes = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const tries = [...gardes].sort((a, b) => a - b);
  const resultat: (number | "…")[] = [];
  for (const n of tries) {
    const precedent = resultat.at(-1);
    if (typeof precedent === "number" && n - precedent === 2) resultat.push(precedent + 1);
    else if (typeof precedent === "number" && n - precedent > 2) resultat.push("…");
    resultat.push(n);
  }
  return resultat;
}

/**
 * Adresse d'une page : `?page=` disparaît pour la page 1 (une seule adresse par page, pour
 * Google), et la recherche est gardée (`?q=pirogue&page=2`).
 */
export function lienPage(chemin: string, page: number, q?: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const texte = params.toString();
  return `${chemin}${texte ? `?${texte}` : ""}#annonces`;
}
