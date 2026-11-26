/**
 * Signaler une annonce (SPEC.md, section 4 septies) : règles pures, utilisables partout.
 *
 * La base applique les mêmes règles (fonctions `signaler_annonce` et `traiter_signalements`) :
 * ces vérifications servent à afficher un message clair avant l'envoi.
 */

export const DETAILS_MAX = 500;
/** « Autre » doit être expliqué, sinon l'administrateur ne sait pas quoi vérifier. */
export const DETAILS_MIN_AUTRE = 10;

export type MotifSignalement = "arnaque" | "interdit" | "doublon" | "categorie" | "autre";

/** Motifs proposés au visiteur, dans l'ordre affiché. */
export const MOTIFS_SIGNALEMENT: { valeur: MotifSignalement; libelle: string }[] = [
  { valeur: "arnaque", libelle: "Arnaque ou fraude" },
  { valeur: "interdit", libelle: "Article interdit" },
  { valeur: "doublon", libelle: "Annonce en double ou spam" },
  { valeur: "categorie", libelle: "Mauvaise catégorie" },
  { valeur: "autre", libelle: "Autre" },
];

export function lireMotif(valeur: unknown): MotifSignalement | null {
  return MOTIFS_SIGNALEMENT.find((m) => m.valeur === valeur)?.valeur ?? null;
}

export function libelleMotif(valeur: string): string {
  return MOTIFS_SIGNALEMENT.find((m) => m.valeur === valeur)?.libelle ?? valeur;
}

/** Vérifie la saisie du visiteur. Renvoie le message à afficher, ou null si elle convient. */
export function verifierSignalement(motif: unknown, details: string): string | null {
  const choisi = lireMotif(motif);
  if (!choisi) return "Choisissez un motif.";
  const net = details.trim();
  if (net.length > DETAILS_MAX) return `Raccourcissez la précision à ${DETAILS_MAX} caractères.`;
  if (choisi === "autre" && net.length < DETAILS_MIN_AUTRE) {
    return `Expliquez le problème en ${DETAILS_MIN_AUTRE} caractères au moins.`;
  }
  return null;
}

export type ReponseSignalement = { ok: true } | { erreur: string };

/** Message au visiteur, d'après le refus renvoyé par la base (`hint`). */
export function messageRefusSignalement(hint: string | undefined): string {
  switch (hint) {
    case "deja":
      return "Vous avez déjà signalé cette annonce. Merci, elle sera vérifiée.";
    case "limite":
      return "Vous avez envoyé beaucoup de signalements. Réessayez dans une heure.";
    case "introuvable":
      return "Cette annonce n'est plus en ligne.";
    case "motif":
    case "details":
      return "Vérifiez le motif et la précision.";
    default:
      return "Le signalement n'a pas pu être envoyé. Réessayez dans un instant.";
  }
}

export type GesteSignalement = "retirer" | "classer";

export function lireGesteSignalement(valeur: unknown): GesteSignalement | null {
  return valeur === "retirer" || valeur === "classer" ? valeur : null;
}

/** Message pour l'administrateur, d'après le refus renvoyé par la base. */
export function messageErreurTraitement(code: string | undefined, hint: string | undefined): string {
  if (code === "42501") return "Cette action est réservée à l'administrateur.";
  if (hint === "deja") return "Ces signalements ont déjà été traités.";
  if (hint === "plus_en_ligne") return "L'annonce n'est plus en ligne : classez les signalements.";
  if (hint === "motif") return "Expliquez le retrait à l'annonceur, en 5 à 500 caractères.";
  return "La décision n'a pas pu être enregistrée. Réessayez.";
}

/** Signalements ouverts d'une même annonce, regroupés pour l'administrateur. */
export type AnnonceSignalee = {
  annonceId: number;
  titre: string;
  vendeur: string;
  enLigne: boolean;
  nombre: number;
  parMotif: { motif: string; nombre: number }[];
  details: string[];
  dernier: string;
};

type LigneSignalement = {
  listing_id: number;
  motif: string;
  details: string | null;
  created_at: string;
  listings: { titre: string; vendeur_nom: string; statut: string; expire_le: string | null } | null;
};

/** Regroupe les signalements par annonce, les plus signalées d'abord (puis les plus récentes). */
export function regrouperSignalements(lignes: LigneSignalement[], maintenant: number): AnnonceSignalee[] {
  const groupes = new Map<number, AnnonceSignalee>();
  for (const ligne of lignes) {
    let groupe = groupes.get(ligne.listing_id);
    if (!groupe) {
      const annonce = ligne.listings;
      groupe = {
        annonceId: ligne.listing_id,
        titre: annonce?.titre ?? "Annonce supprimée",
        vendeur: annonce?.vendeur_nom ?? "—",
        enLigne:
          annonce?.statut === "active" && (!annonce.expire_le || new Date(annonce.expire_le).getTime() > maintenant),
        nombre: 0,
        parMotif: [],
        details: [],
        dernier: ligne.created_at,
      };
      groupes.set(ligne.listing_id, groupe);
    }
    groupe.nombre++;
    const motif = groupe.parMotif.find((m) => m.motif === ligne.motif);
    if (motif) motif.nombre++;
    else groupe.parMotif.push({ motif: ligne.motif, nombre: 1 });
    if (ligne.details) groupe.details.push(ligne.details);
    if (ligne.created_at > groupe.dernier) groupe.dernier = ligne.created_at;
  }
  return [...groupes.values()]
    .map((g) => ({ ...g, parMotif: g.parMotif.sort((a, b) => b.nombre - a.nombre) }))
    .sort((a, b) => b.nombre - a.nombre || b.dernier.localeCompare(a.dernier));
}
