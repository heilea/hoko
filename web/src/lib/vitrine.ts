/**
 * Règles du profil d'une vitrine pro (SPEC.md, section 4 sexies). Fonctions pures, couvertes
 * par les tests. La base refait les mêmes vérifications (fonction `modifier_vitrine`).
 */
import type { StatutVitrine } from "./accounts";
import { categories } from "./data";
import { COMMUNE_MAX, ILES } from "./validation";

export const PRESENTATION_MAX = 1000;
export const HORAIRES_LIGNES_MAX = 7;
export const HORAIRE_LIGNE_MAX = 60;

export type ChampVitrine = "secteur" | "ile" | "commune" | "presentation" | "horaires";
export type VitrineSaisie = Record<ChampVitrine, string>;

export type VitrineValide = {
  secteur: string;
  ile: string;
  commune: string;
  presentation: string;
  /** Une ligne par plage, sans ligne vide. */
  horaires: string[];
};

export type ResultatVitrine =
  | { ok: true; vitrine: VitrineValide }
  | { ok: false; erreurs: Partial<Record<ChampVitrine, string>> };

/** Découpe les horaires saisis (une plage par ligne) en lignes non vides. */
export function lignesHoraires(saisie: string): string[] {
  return saisie
    .split(/\r?\n/)
    .map((ligne) => ligne.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

export function validerVitrine(saisie: VitrineSaisie): ResultatVitrine {
  const erreurs: Partial<Record<ChampVitrine, string>> = {};

  if (!categories.some((c) => c.slug === saisie.secteur)) erreurs.secteur = "Choisissez votre secteur.";
  if (!ILES.includes(saisie.ile)) erreurs.ile = "Choisissez une île.";

  const commune = saisie.commune.trim().replace(/\s+/g, " ");
  if (!commune) erreurs.commune = "Indiquez votre commune.";
  else if (commune.length > COMMUNE_MAX) erreurs.commune = `Raccourcissez la commune à ${COMMUNE_MAX} caractères.`;

  const presentation = saisie.presentation.trim();
  if (presentation.length > PRESENTATION_MAX) {
    erreurs.presentation = `La présentation fait ${presentation.length} caractères. Raccourcissez-la à ${PRESENTATION_MAX}.`;
  } else if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(presentation)) {
    erreurs.presentation = "Retirez l'adresse e-mail. Vos clients vous joignent par téléphone.";
  }

  const horaires = lignesHoraires(saisie.horaires);
  if (horaires.length > HORAIRES_LIGNES_MAX) {
    erreurs.horaires = `${HORAIRES_LIGNES_MAX} lignes au plus. Regroupez les jours qui ont les mêmes horaires.`;
  } else if (horaires.some((ligne) => ligne.length > HORAIRE_LIGNE_MAX)) {
    erreurs.horaires = `Chaque ligne fait ${HORAIRE_LIGNE_MAX} caractères au plus.`;
  }

  if (Object.keys(erreurs).length > 0) return { ok: false, erreurs };
  return { ok: true, vitrine: { secteur: saisie.secteur, ile: saisie.ile, commune, presentation, horaires } };
}

/** Une vitrine est visible du public seulement si elle est active (payée) et vérifiée. */
export function vitrineEnLigne(vitrine: { statut: StatutVitrine; verifie: boolean }): boolean {
  return vitrine.statut === "actif" && vitrine.verifie;
}

/**
 * Ce qui manque pour que la vitrine soit en ligne, dans l'ordre où le pro doit s'en occuper.
 * Liste vide : la vitrine est en ligne.
 */
export function etapesVitrine(vitrine: { statut: StatutVitrine; verifie: boolean }): string[] {
  const etapes: string[] = [];
  if (!vitrine.verifie) {
    etapes.push(
      "Vérification de l'entreprise : Hoko vous écrit à l'adresse e-mail de votre compte pour recevoir les documents de la DICP, puis contrôle votre numéro TAHITI.",
    );
  }
  if (vitrine.statut === "en_attente_paiement") etapes.push("Paiement de l'abonnement : la vitrine s'active dès réception.");
  if (vitrine.statut === "suspendu") etapes.push("Vitrine suspendue : contactez Hoko pour la réactiver.");
  return etapes;
}

/** Gestes de l'administrateur sur une vitrine (fonction `decider_vitrine` de la base). */
export type GesteVitrine = "verifier" | "retirer_badge" | "activer" | "suspendre";

export function lireGesteVitrine(valeur: unknown): GesteVitrine | null {
  return valeur === "verifier" || valeur === "retirer_badge" || valeur === "activer" || valeur === "suspendre" ? valeur : null;
}

/** Boutons proposés à l'administrateur, selon l'état de la vitrine. */
export function gestesVitrine(vitrine: { statut: StatutVitrine; verifie: boolean }): GesteVitrine[] {
  const gestes: GesteVitrine[] = [vitrine.verifie ? "retirer_badge" : "verifier"];
  if (vitrine.statut !== "actif") gestes.push("activer");
  if (vitrine.statut !== "suspendu") gestes.push("suspendre");
  return gestes;
}

export const LIBELLE_GESTE_VITRINE: Record<GesteVitrine, string> = {
  verifier: "Pro vérifié",
  retirer_badge: "Retirer le badge",
  activer: "Activer (paiement reçu)",
  suspendre: "Suspendre",
};

export const CONFIRMATION_VITRINE: Record<GesteVitrine, string> = {
  verifier: "Badge « Pro vérifié » accordé.",
  retirer_badge: "Badge retiré : la vitrine n'est plus en ligne.",
  activer: "Vitrine activée.",
  suspendre: "Vitrine suspendue : elle et ses annonces ont quitté le site.",
};
