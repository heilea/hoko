/**
 * Règles du dépôt d'annonce. Fonctions pures : elles servent au serveur (qui fait foi)
 * et au navigateur (pour prévenir avant l'envoi), et sont couvertes par les tests.
 */
import { categories } from "./data";

/** Îles proposées au dépôt. Liste d'exemple : les îles couvertes en V1 restent à décider (SPEC.md). */
export const ILES = ["Tahiti", "Moorea", "Raiatea", "Bora Bora", "Huahine", "Nuku Hiva"];

export const TITRE_MAX = 80;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 2000;
export const COMMUNE_MAX = 60;

/** Photos : JPEG uniquement, 4 Mo maximum par photo (SPEC.md). */
export const PHOTO_TYPE = "image/jpeg";
export const PHOTO_POIDS_MAX = 4 * 1024 * 1024;
/** Nombre de photos par annonce : valeur proposée, à confirmer. */
export const PHOTOS_MAX = 6;

export type ChampAnnonce =
  | "titre" | "categorie" | "prix" | "description" | "ile" | "commune" | "telephone" | "accord";

export type AnnonceSaisie = Record<Exclude<ChampAnnonce, "accord">, string> & { accord: boolean };

export type AnnonceValide = {
  titre: string;
  categorie: string;
  prixXpf: number;
  description: string;
  ile: string;
  commune: string;
  /** Numéro au format « 87 12 34 56 ». */
  telephone: string;
};

export type ResultatValidation =
  | { ok: true; annonce: AnnonceValide }
  | { ok: false; erreurs: Partial<Record<ChampAnnonce, string>> };

/** Met un numéro polynésien à 8 chiffres au format « 87 12 34 56 ». Renvoie null s'il n'est pas valide. */
export function formaterTelephone(saisie: string): string | null {
  const chiffres = saisie.replace(/^\s*\+689/, "").replace(/[\s.\-]/g, "");
  if (!/^\d{8}$/.test(chiffres)) return null;
  return chiffres.replace(/(\d{2})(?=\d)/g, "$1 ");
}

/** Lit un prix saisi (« 220 000 », « 220000 XPF ») en nombre entier de XPF. Renvoie null s'il n'est pas valide. */
export function lirePrix(saisie: string): number | null {
  const nettoye = saisie.replace(/xpf|f\.?\s*cfp|\s| | /gi, "");
  if (!/^\d{1,10}$/.test(nettoye)) return null;
  const prix = Number(nettoye);
  return prix > 0 ? prix : null;
}

export function validerAnnonce(saisie: AnnonceSaisie): ResultatValidation {
  const erreurs: Partial<Record<ChampAnnonce, string>> = {};

  const titre = saisie.titre.trim().replace(/\s+/g, " ");
  if (!titre) erreurs.titre = "Donnez un titre à votre annonce.";
  else if (titre.length > TITRE_MAX) erreurs.titre = `Le titre fait ${titre.length} caractères. Raccourcissez-le à ${TITRE_MAX}.`;

  if (!categories.some((c) => c.slug === saisie.categorie)) erreurs.categorie = "Choisissez une catégorie.";

  const prixXpf = lirePrix(saisie.prix);
  if (!saisie.prix.trim()) erreurs.prix = "Indiquez un prix en XPF.";
  else if (prixXpf === null) erreurs.prix = "Écrivez le prix en chiffres, sans centimes. Exemple : 25 000.";

  const description = saisie.description.trim();
  if (description.length < DESCRIPTION_MIN) {
    erreurs.description = `Décrivez votre article en ${DESCRIPTION_MIN} caractères au moins.`;
  } else if (description.length > DESCRIPTION_MAX) {
    erreurs.description = `La description fait ${description.length} caractères. Raccourcissez-la à ${DESCRIPTION_MAX}.`;
  } else if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(description)) {
    // L'e-mail n'est jamais affiché sur Hoko : le contact passe par le téléphone.
    erreurs.description = "Retirez l'adresse e-mail de la description. Les acheteurs vous joignent par téléphone.";
  }

  if (!ILES.includes(saisie.ile)) erreurs.ile = "Choisissez une île.";

  const commune = saisie.commune.trim().replace(/\s+/g, " ");
  if (!commune) erreurs.commune = "Indiquez votre commune.";
  else if (commune.length > COMMUNE_MAX) erreurs.commune = `Raccourcissez la commune à ${COMMUNE_MAX} caractères.`;

  const telephone = formaterTelephone(saisie.telephone);
  if (!saisie.telephone.trim()) erreurs.telephone = "Indiquez votre numéro de téléphone.";
  else if (telephone === null) erreurs.telephone = "Le numéro doit compter 8 chiffres. Exemple : 87 12 34 56.";

  if (!saisie.accord) erreurs.accord = "Cochez la case pour accepter que votre numéro soit affiché.";

  if (Object.keys(erreurs).length > 0 || prixXpf === null || telephone === null) return { ok: false, erreurs };
  return { ok: true, annonce: { titre, categorie: saisie.categorie, prixXpf, description, ile: saisie.ile, commune, telephone } };
}

/** Vérifie une photo avant l'envoi. Renvoie le message d'erreur, ou null si elle convient. */
export function verifierPhoto(photo: { name: string; type: string; size: number }): string | null {
  if (photo.type !== PHOTO_TYPE) return `« ${photo.name} » n'est pas une photo JPEG.`;
  if (photo.size > PHOTO_POIDS_MAX) return `« ${photo.name} » dépasse 4 Mo.`;
  return null;
}
