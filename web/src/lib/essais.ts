/**
 * Protections contre les abus (SPEC.md, section 4 octies) : règles pures, sans accès à la base.
 *
 * - Limites d'essais : comptées par la base (fonction `controler_essai`), voir `essais-serveur.ts`.
 * - Piège à robots invisible : un champ caché que seuls les robots remplissent, et un délai
 *   minimal entre l'ouverture du formulaire et l'envoi.
 */

export type GenreEssai = "connexion" | "inscription" | "mot_de_passe";

/** Nom tentant pour un robot, invisible pour les gens (composant PiegeRobots). */
export const CHAMP_PIEGE = "site_web";
/** Heure d'ouverture du formulaire, posée par le navigateur une fois la page prête. */
export const CHAMP_DEBUT = "debut_saisie";
/** Un humain met plus de 3 secondes à remplir un formulaire. */
export const DELAI_MIN_MS = 3000;

export const MESSAGE_ROBOT = "Envoi refusé. Réessayez dans quelques secondes.";

export const MESSAGES_LIMITE: Record<GenreEssai, string> = {
  connexion: "Trop d'essais pour ce compte. Patientez 15 minutes, ou choisissez « Mot de passe oublié ».",
  inscription: "Trop d'inscriptions en peu de temps. Réessayez dans une heure.",
  mot_de_passe: "Trop de demandes en peu de temps. Réessayez dans une heure.",
};

/**
 * Vrai si l'envoi ressemble à un robot : champ piège rempli, heure d'ouverture absente ou
 * illisible, ou formulaire envoyé moins de 3 secondes après son ouverture.
 */
export function estRobot(piege: unknown, debut: unknown, maintenant: number): boolean {
  if (typeof piege === "string" && piege.trim() !== "") return true;
  if (typeof debut !== "string" || !/^\d{13}$/.test(debut)) return true;
  const ecart = maintenant - Number(debut);
  // Une heure d'ouverture dans le futur est fausse (petit écart d'horloge toléré)
  if (ecart < -60_000) return true;
  return ecart < DELAI_MIN_MS;
}

/** Lit le piège dans un formulaire reçu par une action serveur. */
export function formulaireDeRobot(formulaire: FormData, maintenant = Date.now()): boolean {
  return estRobot(formulaire.get(CHAMP_PIEGE), formulaire.get(CHAMP_DEBUT), maintenant);
}
