/**
 * Boost d'une annonce de particulier (SPEC.md, section 1). Les règles sont vérifiées par la
 * base (fonctions commander_boost et decider_boost) ; ce fichier ne sert qu'à l'affichage.
 */

/** Durée d'un boost, à partir de l'activation par l'administrateur. */
export const BOOST_JOURS = 7;
/** Boosts au plus en tête d'une catégorie, garantis 100 % du temps. */
export const PLACES_BOOST = 3;
/** Boosts au plus à la fois pour un particulier (actifs ou en attente de paiement). */
export const MAX_BOOSTS_PARTICULIER = 2;

/** Numéro de commande à mettre en référence du paiement : « B-000123 ». */
export function numeroCommande(id: number | string): string {
  return `B-${String(id).padStart(6, "0")}`;
}

/** Résultat d'une commande, renvoyé par la base. */
export type ResultatCommande = "commande" | "complet" | "max_compte";

export function lireResultatCommande(valeur: unknown): ResultatCommande | null {
  return valeur === "commande" || valeur === "complet" || valeur === "max_compte" ? valeur : null;
}

/** Ce que l'administrateur peut faire d'une commande en attente. */
export type GesteBoost = "activer" | "annuler";

export function lireGesteBoost(valeur: unknown): GesteBoost | null {
  return valeur === "activer" || valeur === "annuler" ? valeur : null;
}

export const LIBELLE_GESTE_BOOST: Record<GesteBoost, string> = {
  activer: "Paiement reçu : activer",
  annuler: "Annuler la commande",
};

export const CONFIRMATION_BOOST: Record<GesteBoost, string> = {
  activer: `Boost activé pour ${BOOST_JOURS} jours.`,
  annuler: "Commande annulée : la place est libérée.",
};

/** Places libres dans la catégorie, jamais négatif. */
export function placesLibres(placesPrises: number, places = PLACES_BOOST): number {
  return Math.max(0, places - placesPrises);
}
