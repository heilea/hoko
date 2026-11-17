/**
 * Règles de la validation des annonces par l'administrateur. Fonctions pures, testées.
 * La base applique les mêmes règles (fonction `moderer_annonce`, migration « moderation ») :
 * ces vérifications servent à afficher un message clair avant l'envoi.
 */
import type { Tables } from "./database.types";

export const MOTIF_MIN = 5;
export const MOTIF_MAX = 500;

export type Decision = "active" | "refusee";

/** Une annonce de la file d'attente, telle que la base la renvoie. */
export type LigneAModerer = Pick<
  Tables<"listings">,
  "id" | "titre" | "description" | "prix_xpf" | "suffixe_prix" | "ile" | "commune" | "vendeur_nom" | "created_at"
> & {
  categories: Pick<Tables<"categories">, "slug" | "nom"> | null;
  photos: Pick<Tables<"photos">, "id" | "chemin" | "ordre">[];
};

/** Lit la décision envoyée par le formulaire. Renvoie null si elle est inconnue. */
export function lireDecision(valeur: unknown): Decision | null {
  return valeur === "active" || valeur === "refusee" ? valeur : null;
}

/** Vérifie le motif d'un refus. Renvoie le message à afficher, ou null s'il convient. */
export function verifierMotifRefus(motif: string): string | null {
  const net = motif.trim();
  if (net.length < MOTIF_MIN) return `Expliquez le refus à l'annonceur, en ${MOTIF_MIN} caractères au moins.`;
  if (net.length > MOTIF_MAX) return `Raccourcissez le motif à ${MOTIF_MAX} caractères.`;
  return null;
}

/** Message pour l'administrateur, d'après le code d'erreur renvoyé par la base. */
export function messageErreurModeration(code: string | undefined): string {
  switch (code) {
    case "42501":
      return "Cette action est réservée à l'administrateur.";
    case "P0002":
      return "Cette annonce a déjà été traitée, ou n'existe plus.";
    case "23514":
      return "Impossible de valider : l'annonceur a déjà atteint son nombre maximum d'annonces actives.";
    case "22023":
      return "La décision ou le motif n'est pas valide.";
    default:
      return "La décision n'a pas pu être enregistrée. Réessayez dans quelques minutes.";
  }
}

/** Depuis combien de temps une annonce attend, en mots simples. */
export function attenteDepuis(creeLe: string, maintenant: number): string {
  const minutes = Math.max(0, Math.floor((maintenant - Date.parse(creeLe)) / 60000));
  if (minutes < 60) return minutes <= 1 ? "à l'instant" : `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return jours === 1 ? "il y a 1 jour" : `il y a ${jours} jours`;
}
