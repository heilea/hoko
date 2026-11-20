/**
 * Espaces pub en V1 (SPEC.md, section 3 ter) : règles pures, utilisables partout.
 *
 * Exclusif seulement, 30 jours à partir de l'activation, pubs créées par l'administrateur.
 * Les vraies vérifications (rôle, place libre) sont faites par la base (`creer_pub`, `decider_pub`).
 */
import { getCategory } from "./data";

export const PUB_JOURS = 30;
/** Format du visuel : bandeau 4:1, recadré au centre s'il n'a pas ces proportions. */
export const PUB_LARGEUR = 1600;
export const PUB_HAUTEUR = 400;

export type Emplacement = "accueil" | "categorie";

/** Une pub prête à afficher sur le site. */
export type PubAffichee = { annonceur: string; lien: string; image: string };

/** Numéro de commande à mettre en référence du paiement. */
export function numeroPub(id: number | string): string {
  return `P-${String(id).padStart(6, "0")}`;
}

export type GestePub = "activer" | "annuler" | "retirer";

export function lireGestePub(valeur: unknown): GestePub | null {
  return valeur === "activer" || valeur === "annuler" || valeur === "retirer" ? valeur : null;
}

export const LIBELLE_GESTE_PUB: Record<GestePub, string> = {
  activer: "Paiement reçu : activer",
  annuler: "Annuler la commande",
  retirer: "Retirer du site",
};

export const CONFIRMATION_PUB: Record<GestePub, string> = {
  activer: `Pub en ligne pour ${PUB_JOURS} jours.`,
  annuler: "Commande annulée.",
  retirer: "Pub retirée du site.",
};

export type PubSaisie = { emplacement: string; categorie: string; annonceur: string; lien: string };
export type ChampPub = keyof PubSaisie | "visuel";

/** Vérifie la saisie de l'administrateur. Renvoie les erreurs par champ (vide si tout va bien). */
export function validerPub(saisie: PubSaisie): Partial<Record<ChampPub, string>> {
  const erreurs: Partial<Record<ChampPub, string>> = {};
  if (saisie.emplacement !== "accueil" && saisie.emplacement !== "categorie") {
    erreurs.emplacement = "Choisissez l'emplacement.";
  } else if (saisie.emplacement === "categorie" && !getCategory(saisie.categorie)) {
    erreurs.categorie = "Choisissez la catégorie.";
  }
  const annonceur = saisie.annonceur.trim();
  if (annonceur.length < 2 || annonceur.length > 80) erreurs.annonceur = "Le nom de l'annonceur fait de 2 à 80 caractères.";
  if (!lienValide(saisie.lien)) erreurs.lien = "Indiquez une adresse complète qui commence par https://";
  return erreurs;
}

/** Adresse du site de l'annonceur : https seulement, sans espace, 500 caractères au plus. */
export function lienValide(lien: string): boolean {
  if (lien.length > 500 || !/^https:\/\/\S+$/.test(lien)) return false;
  try {
    return new URL(lien).protocol === "https:";
  } catch {
    return false;
  }
}

/** Où en est une pub, d'après la base. Une pub dont la fin est passée est terminée d'elle-même. */
export function etatPub(statut: string, fin: string | null, maintenant: number): "en_attente" | "en_place" | "terminee" | "annulee" {
  if (statut === "en_attente_paiement") return "en_attente";
  if (statut === "annule") return "annulee";
  if (statut === "actif" && fin && new Date(fin).getTime() > maintenant) return "en_place";
  return "terminee";
}
