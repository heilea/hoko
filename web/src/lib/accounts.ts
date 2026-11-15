/**
 * Comptes de démonstration et ce que chaque annonceur voit dans son espace.
 *
 * ATTENTION : ce fichier remplace la vraie gestion des comptes, qui reste à choisir
 * (fournisseur d'authentification, SPEC.md section 8). Les mots de passe ci-dessous sont
 * des valeurs de démonstration, écrites en clair. Ne jamais y mettre un vrai mot de passe.
 * Avec une vraie base : mots de passe hachés, inscription, réinitialisation, limite d'essais.
 */
import { getCategory, getListing, getPro, getProListings, MAX_ANNONCES_PRO, type Pro } from "./data";

export type Account = {
  id: string;
  type: "particulier" | "pro";
  /** Prénom du particulier, ou nom de l'entreprise. */
  nom: string;
  email: string;
  /** Visible par le titulaire du compte uniquement. */
  telephone: string;
  /** Vitrine du pro. */
  shopId?: Pro["slug"];
};

export type StatutAnnonce = "active" | "en_attente_validation" | "refusee";
export type StatutBoost = "aucun" | "actif" | "en_attente_paiement";

/** Une annonce vue par son propriétaire, avec son statut et ses chiffres. */
export type AccountListing = {
  id: string;
  titre: string;
  prixXpf: number;
  categorie: string;
  statut: StatutAnnonce;
  boost: StatutBoost;
  /** Chiffres d'exemple : les vues et les clics ne sont pas encore comptés. */
  vues: number;
  contacts: number;
  /** Page publique de l'annonce, si elle est en ligne. */
  lien?: string;
};

type CompteDemo = Account & { motDePasseDemo: string };

const comptes: CompteDemo[] = [
  {
    id: "teva",
    type: "particulier",
    nom: "Teva",
    email: "teva@demo.hoko.pf",
    telephone: "87 00 00 01",
    motDePasseDemo: "demo-hoko",
  },
  {
    id: "moana-auto",
    type: "pro",
    nom: "Moana Auto",
    email: "contact@moana-auto.demo.hoko.pf",
    telephone: "40 00 00 02",
    shopId: "moana-auto",
    motDePasseDemo: "demo-hoko",
  },
];

/** Annonces du particulier de démonstration : en ligne, en attente et refusée. */
const annoncesTeva: Omit<AccountListing, "titre" | "prixXpf" | "categorie" | "lien">[] = [
  { id: "1", statut: "active", boost: "actif", vues: 214, contacts: 9 },
  { id: "4", statut: "active", boost: "en_attente_paiement", vues: 61, contacts: 2 },
];

const brouillonsTeva: AccountListing[] = [
  { id: "t-1", titre: "Casque intégral taille M", prixXpf: 12000, categorie: "vehicules", statut: "en_attente_validation", boost: "aucun", vues: 0, contacts: 0 },
  { id: "t-2", titre: "Lot de pièces détachées", prixXpf: 30000, categorie: "vehicules", statut: "refusee", boost: "aucun", vues: 0, contacts: 0 },
];

function sansMotDePasse(compte: CompteDemo): Account {
  const { motDePasseDemo: _retire, ...reste } = compte;
  void _retire;
  return reste;
}

export function getAccount(id: string | null): Account | null {
  const compte = comptes.find((c) => c.id === id);
  return compte ? sansMotDePasse(compte) : null;
}

/** Vérifie un e-mail et un mot de passe. Renvoie le compte, ou null si l'un des deux est faux. */
export function verifierIdentifiants(email: string, motDePasse: string): Account | null {
  const compte = comptes.find((c) => c.email === email.trim().toLowerCase());
  if (!compte || compte.motDePasseDemo !== motDePasse) return null;
  return sansMotDePasse(compte);
}

/** Comptes proposés sur la page de connexion de la démonstration. */
export function getComptesDemo(): { type: Account["type"]; email: string; motDePasse: string }[] {
  return comptes.map((c) => ({ type: c.type, email: c.email, motDePasse: c.motDePasseDemo }));
}

/** Les annonces d'un compte, telles que son propriétaire les voit. */
export function getAccountListings(compte: Account): AccountListing[] {
  if (compte.type === "pro" && compte.shopId) {
    // Chiffres d'exemple, stables d'un affichage à l'autre
    return getProListings(compte.shopId).map((annonce, rang) => ({
      id: annonce.id,
      titre: annonce.titre,
      prixXpf: annonce.prixXpf,
      categorie: annonce.categorie,
      statut: "active",
      boost: "aucun", // un pro ne peut pas booster
      vues: 320 - rang * 85,
      contacts: 14 - rang * 4,
      lien: `/annonces/${annonce.id}`,
    }));
  }
  const enLigne = annoncesTeva.flatMap((suivi) => {
    const annonce = getListing(suivi.id);
    if (!annonce) return [];
    return [{ ...suivi, titre: annonce.titre, prixXpf: annonce.prixXpf, categorie: annonce.categorie, lien: `/annonces/${annonce.id}` }];
  });
  return [...enLigne, ...brouillonsTeva];
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

/** État de la vitrine d'un pro. Valeurs d'exemple : le paiement et la vérification ne sont pas branchés. */
export function getVitrine(compte: Account) {
  const pro = compte.shopId ? getPro(compte.shopId) : undefined;
  if (!pro) return null;
  return {
    pro,
    secteur: getCategory(pro.categorie)?.nom ?? pro.secteur,
    statut: "active" as "active" | "en_attente_paiement" | "suspendue",
    verifie: true,
    annonces: getProListings(pro.slug).length,
    maximum: MAX_ANNONCES_PRO,
  };
}

export const LIBELLE_STATUT: Record<StatutAnnonce, string> = {
  active: "Active",
  en_attente_validation: "En attente de validation",
  refusee: "Refusée",
};

export const LIBELLE_BOOST: Record<Exclude<StatutBoost, "aucun">, string> = {
  actif: "Boost actif",
  en_attente_paiement: "Boost en attente de paiement",
};
