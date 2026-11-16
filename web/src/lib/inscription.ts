/**
 * Règles de l'inscription (SPEC.md, section 4 quater). Fonctions pures, couvertes par les tests.
 */
import { categories } from "./data";
import { COMMUNE_MAX, formaterTelephone, ILES } from "./validation";

/** Longueurs proposées, à confirmer. */
export const NOM_MIN = 2;
export const NOM_MAX = 60;
export const MOT_DE_PASSE_MIN = 8;
export const MOT_DE_PASSE_MAX = 200;
/** Le format exact du numéro TAHITI reste à vérifier : on n'impose qu'une longueur maximale. */
export const NUMERO_TAHITI_MAX = 20;

export type TypeCompte = "particulier" | "pro";

export type ChampInscription =
  | "type" | "nom" | "email" | "telephone" | "motDePasse" | "confirmation"
  | "numeroTahiti" | "secteur" | "ile" | "commune";

export type InscriptionSaisie = Record<ChampInscription, string>;

/** Ce qui est renvoyé au formulaire après un refus : jamais les mots de passe. */
export type InscriptionRenvoyee = Omit<InscriptionSaisie, "motDePasse" | "confirmation">;

/** Une inscription acceptée. Le mot de passe n'y figure pas : il ne doit être gardé que haché. */
export type InscriptionValide = {
  type: TypeCompte;
  nom: string;
  email: string;
  /** Numéro au format « 87 12 34 56 ». */
  telephone: string;
  vitrine?: { numeroTahiti: string; secteur: string; ile: string; commune: string };
};

export type ResultatInscription =
  | { ok: true; compte: InscriptionValide }
  | { ok: false; erreurs: Partial<Record<ChampInscription, string>> };

/** Met un e-mail en minuscules, sans espaces autour. Renvoie null s'il n'a pas la forme d'un e-mail. */
export function lireEmail(saisie: string): string | null {
  const email = saisie.trim().toLowerCase();
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

/**
 * Vérifie une inscription.
 * @param emailDejaUtilise indique si un compte existe déjà avec cet e-mail
 */
export function validerInscription(
  saisie: InscriptionSaisie,
  emailDejaUtilise: (email: string) => boolean = () => false,
): ResultatInscription {
  const erreurs: Partial<Record<ChampInscription, string>> = {};
  const pro = saisie.type === "pro";

  if (saisie.type !== "particulier" && saisie.type !== "pro") erreurs.type = "Choisissez un type de compte.";

  const nom = saisie.nom.trim().replace(/\s+/g, " ");
  if (!nom) erreurs.nom = pro ? "Indiquez le nom de votre entreprise." : "Indiquez votre prénom.";
  else if (nom.length < NOM_MIN) erreurs.nom = `Écrivez ${NOM_MIN} caractères au moins.`;
  else if (nom.length > NOM_MAX) erreurs.nom = `Raccourcissez à ${NOM_MAX} caractères.`;

  const email = lireEmail(saisie.email);
  if (!saisie.email.trim()) erreurs.email = "Indiquez votre e-mail.";
  else if (email === null) erreurs.email = "Cet e-mail n'est pas valide. Exemple : prenom@exemple.pf.";
  else if (emailDejaUtilise(email)) erreurs.email = "Un compte existe déjà avec cet e-mail. Connectez-vous.";

  const telephone = formaterTelephone(saisie.telephone);
  if (!saisie.telephone.trim()) erreurs.telephone = "Indiquez votre numéro de téléphone.";
  else if (telephone === null) erreurs.telephone = "Le numéro doit compter 8 chiffres. Exemple : 87 12 34 56.";

  if (!saisie.motDePasse) erreurs.motDePasse = "Choisissez un mot de passe.";
  else if (saisie.motDePasse.length < MOT_DE_PASSE_MIN) {
    erreurs.motDePasse = `Le mot de passe doit compter ${MOT_DE_PASSE_MIN} caractères au moins.`;
  } else if (saisie.motDePasse.length > MOT_DE_PASSE_MAX) {
    erreurs.motDePasse = `Raccourcissez le mot de passe à ${MOT_DE_PASSE_MAX} caractères.`;
  }

  if (!saisie.confirmation) erreurs.confirmation = "Saisissez le mot de passe une seconde fois.";
  else if (saisie.confirmation !== saisie.motDePasse) erreurs.confirmation = "Les deux mots de passe sont différents.";

  // Les champs de la vitrine ne comptent que pour un pro
  const numeroTahiti = saisie.numeroTahiti.trim().replace(/\s+/g, " ").toUpperCase();
  const commune = saisie.commune.trim().replace(/\s+/g, " ");
  if (pro) {
    if (!numeroTahiti) erreurs.numeroTahiti = "Indiquez le numéro TAHITI de votre entreprise.";
    else if (numeroTahiti.length > NUMERO_TAHITI_MAX || !/^[A-Z0-9][A-Z0-9 -]*$/.test(numeroTahiti)) {
      erreurs.numeroTahiti = "Le numéro TAHITI ne contient que des lettres, des chiffres, des espaces ou des tirets.";
    }

    if (!categories.some((c) => c.slug === saisie.secteur)) erreurs.secteur = "Choisissez votre secteur.";
    if (!ILES.includes(saisie.ile)) erreurs.ile = "Choisissez une île.";

    if (!commune) erreurs.commune = "Indiquez votre commune.";
    else if (commune.length > COMMUNE_MAX) erreurs.commune = `Raccourcissez la commune à ${COMMUNE_MAX} caractères.`;
  }

  if (Object.keys(erreurs).length > 0 || email === null || telephone === null) return { ok: false, erreurs };

  return {
    ok: true,
    compte: {
      type: pro ? "pro" : "particulier",
      nom,
      email,
      telephone,
      ...(pro ? { vitrine: { numeroTahiti, secteur: saisie.secteur, ile: saisie.ile, commune } } : {}),
    },
  };
}
