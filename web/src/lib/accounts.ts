/**
 * Ce que chaque annonceur voit dans son espace : types et règles.
 *
 * Fonctions pures, couvertes par les tests. La lecture dans Supabase est dans
 * `compte-donnees.ts`.
 */
import { MAX_ANNONCES_PARTICULIER, MAX_ANNONCES_PRO } from "./data";
import type { Tables } from "./database.types";

export type Account = {
  /** Identifiant Supabase Auth. */
  id: string;
  type: "particulier" | "pro";
  /** Prénom du particulier, ou nom de l'entreprise. */
  nom: string;
  /** Sert à se connecter. Visible par le titulaire du compte uniquement. */
  email: string;
  /** Visible par le titulaire du compte uniquement. */
  telephone: string;
  /** Adresse de la vitrine du pro. */
  shopId?: string;
  /** Administrateur de Hoko : valide les annonces (espace /admin). */
  admin: boolean;
};

/**
 * États d'une annonce vus par son propriétaire (SPEC.md, 4 quinquies). « expiree » n'existe pas
 * dans la base : c'est une annonce « active » dont la date de fin est passée.
 */
export type StatutAnnonce = "active" | "en_attente_validation" | "refusee" | "retiree" | "vendue" | "expiree";
/** Ce que l'annonceur peut faire d'une annonce, selon son état. */
export type Geste = "vendue" | "retirer" | "republier" | "modifier";
export type StatutBoost = "aucun" | "actif" | "en_attente_paiement";
export type StatutVitrine = "en_attente_paiement" | "actif" | "suspendu";

/** Une annonce vue par son propriétaire, avec son statut et ses chiffres. */
export type AccountListing = {
  id: string;
  titre: string;
  prixXpf: number;
  categorie: string;
  statut: StatutAnnonce;
  boost: StatutBoost;
  /** Les vues et les clics sur « Voir le numéro » ne sont pas encore comptés. */
  vues: number;
  contacts: number;
  /** Page publique de l'annonce, si elle est en ligne. */
  lien?: string;
  /** Raison donnée par l'administrateur, pour une annonce refusée. */
  motif?: string;
  /** Date de fin d'une annonce en ligne (« 17 décembre »), à l'heure de Tahiti. */
  finLe?: string;
  /** Boutons proposés, dans l'ordre d'affichage. */
  gestes: Geste[];
};

/** La vitrine d'un pro, telle qu'il la voit dans son espace. */
export type Vitrine = {
  slug: string;
  nom: string;
  secteur: string;
  ile: string;
  commune: string;
  presentation: string;
  horaires: string[];
  /** Badge « Pro vérifié » : accordé après contrôle du numéro TAHITI. */
  verifie: boolean;
  statut: StatutVitrine;
  annonces: number;
  maximum: number;
};

/** Une ligne de la table `listings` (types générés), avec le slug de sa catégorie. */
export type LigneAnnonce = Pick<Tables<"listings">, "id" | "titre" | "prix_xpf" | "statut" | "boost_jusqu_au" | "motif_refus" | "expire_le"> & {
  categories: Pick<Tables<"categories">, "slug"> | null;
};

const STATUTS_ANNONCE: readonly StatutAnnonce[] = ["active", "en_attente_validation", "refusee", "retiree", "vendue"];
const STATUTS_VITRINE: readonly StatutVitrine[] = ["en_attente_paiement", "actif", "suspendu"];

/**
 * Ramène un statut lu dans la base (du texte) à une valeur connue. Une valeur inconnue est
 * traitée avec prudence : l'annonce est considérée comme en attente, jamais comme en ligne.
 */
export function lireStatutAnnonce(valeur: string): StatutAnnonce {
  return STATUTS_ANNONCE.find((s) => s === valeur) ?? "en_attente_validation";
}

/** Même principe pour une vitrine : une valeur inconnue la laisse hors ligne. */
export function lireStatutVitrine(valeur: string): StatutVitrine {
  return STATUTS_VITRINE.find((s) => s === valeur) ?? "en_attente_paiement";
}

/** Durée en ligne d'une annonce de particulier, à partir de la validation (SPEC.md, 4 quinquies). */
export const DUREE_ANNONCE_JOURS = 30;

/** Boutons proposés pour chaque état : un ou deux gestes simples, le plus utile en premier. */
const GESTES: Record<StatutAnnonce, Geste[]> = {
  active: ["vendue", "modifier", "retirer"],
  en_attente_validation: ["modifier", "retirer"],
  refusee: ["modifier"],
  vendue: ["republier", "modifier"],
  retiree: ["republier", "modifier"],
  expiree: ["republier", "modifier"],
};

export function gestesPossibles(statut: StatutAnnonce): Geste[] {
  return GESTES[statut];
}

/** Lit un geste envoyé par un formulaire. Renvoie null pour une valeur inconnue. */
export function lireGeste(valeur: unknown): Exclude<Geste, "modifier"> | null {
  return valeur === "vendue" || valeur === "retirer" || valeur === "republier" ? valeur : null;
}

/** « 17 décembre », à l'heure de Tahiti. */
export function dateCourte(instant: string): string {
  return new Date(instant).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Pacific/Tahiti" });
}

/** Met une annonce de la base au format de l'espace annonceur. */
export function versSuivi(ligne: LigneAnnonce, maintenant: number): AccountListing {
  const id = String(ligne.id);
  const fin = ligne.expire_le ? Date.parse(ligne.expire_le) : NaN;
  const lu = lireStatutAnnonce(ligne.statut);
  // Une annonce active dont la date de fin est passée a quitté le site : elle est expirée
  const statut: StatutAnnonce = lu === "active" && fin <= maintenant ? "expiree" : lu;
  const boostFin = ligne.boost_jusqu_au ? Date.parse(ligne.boost_jusqu_au) : NaN;
  return {
    id,
    titre: ligne.titre,
    prixXpf: ligne.prix_xpf,
    categorie: ligne.categories?.slug ?? "",
    statut,
    boost: boostFin > maintenant ? "actif" : "aucun",
    vues: 0,
    contacts: 0,
    lien: statut === "active" ? `/annonces/${id}` : undefined,
    motif: statut === "refusee" ? (ligne.motif_refus ?? undefined) : undefined,
    finLe: (statut === "active" || statut === "expiree") && ligne.expire_le ? dateCourte(ligne.expire_le) : undefined,
    gestes: gestesPossibles(statut),
  };
}

/** Nombre d'annonces actives autorisé : 5 pour un particulier, 20 pour la vitrine d'un pro. */
export function maximumAnnonces(compte: Pick<Account, "type">): number {
  return compte.type === "pro" ? MAX_ANNONCES_PRO : MAX_ANNONCES_PARTICULIER;
}

/** Indique si le compte peut encore publier une annonce, d'après ses annonces actives. */
export function peutPublier(compte: Pick<Account, "type">, annonces: Pick<AccountListing, "statut">[]): boolean {
  return annonces.filter((a) => a.statut === "active").length < maximumAnnonces(compte);
}

export type ResumeCompte = { actives: number; vues: number; contacts: number; total: number };

export function resumer(annonces: AccountListing[]): ResumeCompte {
  return {
    actives: annonces.filter((a) => a.statut === "active").length,
    vues: annonces.reduce((somme, a) => somme + a.vues, 0),
    contacts: annonces.reduce((somme, a) => somme + a.contacts, 0),
    total: annonces.length,
  };
}

export const LIBELLE_STATUT: Record<StatutAnnonce, string> = {
  active: "En ligne",
  en_attente_validation: "En attente de validation",
  refusee: "Refusée",
  retiree: "Retirée",
  vendue: "Vendue",
  expiree: "Expirée",
};

/** Texte des boutons de « Mes annonces ». */
export const LIBELLE_GESTE: Record<Geste, string> = {
  vendue: "Marquer vendue",
  retirer: "Retirer",
  republier: "Republier 30 jours",
  modifier: "Modifier",
};

/** Message affiché après un geste réussi (`?fait=` dans l'adresse). */
export const CONFIRMATION_GESTE: Record<string, string> = {
  vendue: "Annonce marquée vendue : elle a quitté le site. Félicitations !",
  retiree: "Annonce retirée : elle a quitté le site.",
  active: `Annonce republiée : elle est en ligne pour ${DUREE_ANNONCE_JOURS} jours.`,
  en_attente_validation: "Annonce renvoyée à la validation : elle sera en ligne une fois vérifiée.",
  modifiee: "Annonce modifiée : elle sera de nouveau en ligne une fois vérifiée par Hoko.",
};

export const LIBELLE_BOOST: Record<Exclude<StatutBoost, "aucun">, string> = {
  actif: "Boost actif",
  en_attente_paiement: "Boost en attente de paiement",
};

export const LIBELLE_VITRINE: Record<StatutVitrine, string> = {
  actif: "Vitrine active",
  en_attente_paiement: "En attente de paiement",
  suspendu: "Vitrine suspendue",
};
