/**
 * Données d'exemple du MVP.
 *
 * Elles remplacent la base de données tant que le fournisseur n'est pas choisi
 * (voir SPEC.md, section 8). Les fonctions d'accès en bas de fichier sont le
 * seul point à réécrire le jour où une vraie base arrive.
 *
 * Catégories et îles : à confirmer (SPEC.md, points à décider).
 */
import { normaliser } from "./format";

export type IconName =
  | "vehicules" | "immobilier" | "emploi" | "services" | "maison" | "multimedia"
  | "mode" | "sports" | "nautisme" | "animaux"
  | "lieu" | "loupe" | "gratuit" | "telephone" | "boost" | "fleche" | "chevron" | "horloge" | "verifie";

export type Category = {
  slug: string;
  nom: string;
  icone: IconName;
  /** Description courte affichée dans l'en-tête de la page de la catégorie. */
  description: string;
};

export type Listing = {
  id: string;
  titre: string;
  description: string;
  prixXpf: number;
  /** Complément du prix, par exemple « / mois » pour une location. */
  suffixePrix?: string;
  categorie: Category["slug"];
  commune: string;
  ile: string;
  /** Libellé de date. Sera calculé à partir de la date de publication avec la base. */
  publiee: string;
  /** Boost actif : l'annonce remonte en tête de sa catégorie pendant 7 jours. */
  boost: boolean;
  /** Prénom du vendeur, ou nom du pro. Son numéro est servi à part, voir getListingPhone. */
  vendeur: string;
  /**
   * Vitrine du pro qui vend, s'il s'agit d'une annonce pro. Les annonces pro ne vivent que
   * dans la vitrine : elles n'apparaissent ni dans la recherche ni dans les catégories.
   */
  shopId?: Pro["slug"];
};

export type Pro = {
  slug: string;
  nom: string;
  secteur: string;
  ile: string;
  /** Catégorie dans laquelle le pro est mis en avant. */
  categorie: Category["slug"];
  commune: string;
  /** Présentation de l'entreprise, affichée sur sa vitrine. */
  presentation: string;
  /** Horaires d'ouverture, une ligne par plage. */
  horaires: string[];
};

/** Un pro ne peut pas avoir plus de 20 annonces actives dans sa vitrine. */
export const MAX_ANNONCES_PRO = 20;

export const categories: Category[] = [
  { slug: "vehicules", nom: "Véhicules", icone: "vehicules", description: "Voitures, scooters, pick-up et pièces détachées." },
  { slug: "immobilier", nom: "Immobilier", icone: "immobilier", description: "Locations, ventes et terrains, de Tahiti aux îles." },
  { slug: "emploi", nom: "Emploi", icone: "emploi", description: "Offres et demandes d'emploi." },
  { slug: "services", nom: "Services", icone: "services", description: "Plomberie, jardinage, cours et dépannage." },
  { slug: "maison", nom: "Maison", icone: "maison", description: "Meubles, électroménager et outils." },
  { slug: "multimedia", nom: "Multimédia", icone: "multimedia", description: "Téléphones, ordinateurs et consoles." },
  { slug: "mode", nom: "Mode", icone: "mode", description: "Vêtements, bijoux et accessoires." },
  { slug: "sports", nom: "Sports", icone: "sports", description: "Vélos, surf, instruments et loisirs." },
  { slug: "nautisme", nom: "Nautisme", icone: "nautisme", description: "Bateaux, pirogues et moteurs." },
  { slug: "animaux", nom: "Animaux", icone: "animaux", description: "Adoptions et accessoires pour animaux." },
];

const listings: Listing[] = [
  {
    id: "1",
    titre: "Scooter 125 cm³, 14 000 km",
    description:
      "Scooter 125 cm³ de 2021, 14 000 km, toujours entretenu chez le concessionnaire.\nPneus et plaquettes changés il y a deux mois. Vendu avec un casque et un top-case.\nVisible à Papeete en fin de journée.",
    prixXpf: 220000,
    categorie: "vehicules",
    commune: "Papeete",
    ile: "Tahiti",
    publiee: "aujourd'hui",
    boost: true,
    vendeur: "Teva",
  },
  {
    id: "2",
    titre: "Pirogue V1 carbone avec rame",
    description:
      "Pirogue V1 en carbone, très bon état, une seule saison de course.\nVendue avec sa rame et ses supports de transport.\nEssai possible à la marina de Punaauia.",
    prixXpf: 180000,
    categorie: "nautisme",
    commune: "Punaauia",
    ile: "Tahiti",
    publiee: "aujourd'hui",
    boost: false,
    vendeur: "Hinano",
  },
  {
    id: "3",
    titre: "Studio meublé proche du quai",
    description:
      "Studio meublé de 28 m² à cinq minutes à pied du quai d'Uturoa.\nCuisine équipée, climatisation, eau chaude solaire.\nLibre au début du mois prochain. Charges non comprises.",
    prixXpf: 95000,
    suffixePrix: " / mois",
    categorie: "immobilier",
    commune: "Uturoa",
    ile: "Raiatea",
    publiee: "hier",
    boost: false,
    vendeur: "Maeva",
  },
  {
    id: "4",
    titre: "Canapé d'angle 5 places",
    description:
      "Canapé d'angle 5 places en tissu gris, déhoussable.\nAcheté il y a deux ans, vendu pour cause de déménagement.\nÀ venir chercher à Mahina, prévoir un pick-up.",
    prixXpf: 60000,
    categorie: "maison",
    commune: "Mahina",
    ile: "Tahiti",
    publiee: "hier",
    boost: false,
    vendeur: "Teva",
  },
  {
    id: "5",
    titre: "Ukulélé de concert en kou",
    description:
      "Ukulélé de concert fabriqué à la main en bois de kou.\nSon chaud, mécaniques neuves, livré avec sa housse.",
    prixXpf: 35000,
    categorie: "sports",
    commune: "Afareaitu",
    ile: "Moorea",
    publiee: "hier",
    boost: false,
    vendeur: "Manutea",
  },
  {
    id: "6",
    titre: "Ordinateur portable 15 pouces",
    description:
      "Ordinateur portable 15 pouces, 16 Go de mémoire, disque SSD de 512 Go.\nBatterie en bon état, vendu avec son chargeur et une sacoche.",
    prixXpf: 85000,
    categorie: "multimedia",
    commune: "Faa'a",
    ile: "Tahiti",
    publiee: "il y a 2 jours",
    boost: false,
    vendeur: "Vaea",
  },
  {
    id: "7",
    titre: "Pick-up 4x4 double cabine, 2018",
    description:
      "Pick-up 4x4 double cabine de 2018, diesel, 92 000 km.\nContrôle technique à jour, carnet d'entretien complet.\nIdéal pour les routes de l'île.",
    prixXpf: 2400000,
    categorie: "vehicules",
    commune: "Vaitape",
    ile: "Bora Bora",
    publiee: "il y a 2 jours",
    boost: false,
    vendeur: "Tamatoa",
  },
  {
    id: "8",
    titre: "Planche de surf 6'2 avec housse",
    description:
      "Planche de surf 6'2, quelques réparations propres sur le rail.\nVendue avec housse, leash et jeu de dérives.",
    prixXpf: 40000,
    categorie: "sports",
    commune: "Teahupoo",
    ile: "Tahiti",
    publiee: "il y a 3 jours",
    boost: false,
    vendeur: "Raimana",
  },
];

const pros: Pro[] = [
  {
    slug: "fare-plomberie",
    nom: "Fare Plomberie",
    secteur: "Plomberie",
    ile: "Tahiti",
    categorie: "services",
    commune: "Pirae",
    presentation:
      "Dépannage et installation de plomberie sur toute l'île de Tahiti. Fuites, chauffe-eau solaires, salles de bains : nous intervenons chez les particuliers et les entreprises.",
    horaires: ["Lundi au vendredi : 7 h à 16 h", "Samedi : 7 h à 11 h", "Urgences : sur appel"],
  },
  {
    slug: "moana-auto",
    nom: "Moana Auto",
    secteur: "Véhicules",
    ile: "Tahiti",
    categorie: "vehicules",
    commune: "Faa'a",
    presentation:
      "Vente de véhicules d'occasion révisés et garantis. Chaque voiture passe par notre atelier avant d'être mise en vente. Reprise de votre ancien véhicule possible.",
    horaires: ["Lundi au vendredi : 7 h 30 à 17 h", "Samedi : 8 h à 12 h"],
  },
  {
    slug: "jardins-de-la-presquile",
    nom: "Jardins de la Presqu'île",
    secteur: "Jardinage",
    ile: "Tahiti",
    categorie: "services",
    commune: "Taravao",
    presentation:
      "Entretien de jardins, élagage et création d'espaces verts à la Presqu'île. Contrats à l'année ou interventions ponctuelles.",
    horaires: ["Lundi au vendredi : 6 h 30 à 15 h"],
  },
  {
    slug: "immo-motu",
    nom: "Immo Motu",
    secteur: "Immobilier",
    ile: "Moorea",
    categorie: "immobilier",
    commune: "Maharepa",
    presentation:
      "Agence immobilière à Moorea : locations à l'année, ventes de maisons et de terrains. Nous connaissons chaque quartier de l'île.",
    horaires: ["Lundi au vendredi : 8 h à 16 h 30", "Samedi : sur rendez-vous"],
  },
  {
    slug: "tech-fenua",
    nom: "Tech Fenua",
    secteur: "Informatique",
    ile: "Tahiti",
    categorie: "multimedia",
    commune: "Papeete",
    presentation:
      "Vente et réparation d'ordinateurs, de téléphones et de tablettes. Matériel neuf et reconditionné, garanti en magasin.",
    horaires: ["Lundi au vendredi : 8 h à 17 h", "Samedi : 8 h à 12 h"],
  },
  {
    slug: "atelier-tifaifai",
    nom: "Atelier Tifaifai",
    secteur: "Couture",
    ile: "Raiatea",
    categorie: "mode",
    commune: "Uturoa",
    presentation:
      "Tifaifai cousus main, robes et chemises sur mesure. Chaque pièce est réalisée à l'atelier, à Uturoa.",
    horaires: ["Mardi au samedi : 8 h à 15 h"],
  },
];

/** Fabrique une annonce pro. Jamais boostée : le boost est réservé aux particuliers. */
function annoncePro(
  id: string,
  shopId: string,
  titre: string,
  prixXpf: number,
  description: string,
  suffixePrix?: string,
): Listing {
  const pro = pros.find((p) => p.slug === shopId);
  if (!pro) throw new Error(`Vitrine inconnue : ${shopId}`);
  return {
    id,
    titre,
    description,
    prixXpf,
    suffixePrix,
    categorie: pro.categorie,
    commune: pro.commune,
    ile: pro.ile,
    publiee: "cette semaine",
    boost: false,
    vendeur: pro.nom,
    shopId,
  };
}

const annoncesPro: Listing[] = [
  annoncePro("p1", "fare-plomberie", "Dépannage de fuite à domicile", 8000, "Recherche et réparation de fuite, déplacement compris sur la zone urbaine de Tahiti.\nDevis gratuit avant toute intervention plus importante."),
  annoncePro("p2", "fare-plomberie", "Pose de chauffe-eau solaire 200 L", 185000, "Fourniture et pose d'un chauffe-eau solaire de 200 litres.\nInstallation en une journée, garantie pièces et main-d'œuvre."),
  annoncePro("p3", "fare-plomberie", "Rénovation complète de salle de bains", 450000, "Dépose de l'ancien équipement, plomberie, pose de la douche et du meuble vasque.\nPrix de départ pour une salle de bains de 4 m²."),
  annoncePro("p4", "moana-auto", "Citadine 5 portes, 2020, 38 000 km", 1450000, "Citadine essence de 2020, première main, 38 000 km.\nRévisée dans notre atelier, garantie 6 mois."),
  annoncePro("p5", "moana-auto", "SUV 7 places diesel, 2019", 2950000, "SUV 7 places de 2019, diesel, boîte automatique, 71 000 km.\nContrôle technique à jour, garantie 6 mois."),
  annoncePro("p6", "moana-auto", "Utilitaire fourgon, 2021", 2200000, "Fourgon utilitaire de 2021, 45 000 km, idéal pour les artisans.\nCloison de séparation et plancher bois."),
  annoncePro("p7", "jardins-de-la-presquile", "Entretien de jardin au mois", 25000, "Tonte, taille des haies et ramassage des déchets verts, deux passages par mois.\nTarif pour un jardin jusqu'à 500 m².", " / mois"),
  annoncePro("p8", "jardins-de-la-presquile", "Élagage de cocotier", 6000, "Élagage et nettoyage d'un cocotier, noix et palmes évacuées.\nPrix par arbre, dégressif à partir de cinq."),
  annoncePro("p9", "immo-motu", "Maison F3 avec jardin à Maharepa", 180000, "Maison F3 de 85 m² avec jardin clos, à cinq minutes des commerces.\nLocation à l'année, libre le mois prochain.", " / mois"),
  annoncePro("p10", "immo-motu", "Terrain viabilisé de 800 m² côté montagne", 14500000, "Terrain plat de 800 m², eau et électricité en bordure.\nVue dégagée sur la baie."),
  annoncePro("p11", "tech-fenua", "Ordinateur portable reconditionné 14 pouces", 65000, "Portable 14 pouces reconditionné, 8 Go de mémoire, SSD 256 Go.\nGaranti 12 mois en magasin."),
  annoncePro("p12", "tech-fenua", "Remplacement d'écran de téléphone", 15000, "Remplacement de l'écran en une heure pour les modèles courants.\nPrix de départ, pièce et main-d'œuvre comprises."),
  annoncePro("p13", "tech-fenua", "Tablette 10 pouces neuve", 42000, "Tablette 10 pouces, 64 Go, livrée avec sa coque.\nGarantie 2 ans."),
  annoncePro("p14", "atelier-tifaifai", "Tifaifai deux personnes cousu main", 95000, "Tifaifai pour lit deux personnes, motif uru, entièrement cousu à la main.\nCouleurs au choix, délai de trois semaines."),
  annoncePro("p15", "atelier-tifaifai", "Chemise sur mesure en tissu local", 9500, "Chemise homme sur mesure, tissu à choisir à l'atelier.\nPrête en une semaine."),
];

/** Toutes les annonces. Seules les fonctions ci-dessous décident lesquelles montrer et où. */
const toutes: Listing[] = [...listings, ...annoncesPro];

export function getCategory(slug: string | undefined): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

/**
 * Annonces de particuliers dont le titre, la catégorie ou le lieu contient la recherche.
 * Les annonces pro n'y figurent jamais.
 */
export function searchListings(q?: string): Listing[] {
  const mots = normaliser(q?.trim() ?? "");
  return listings.filter((annonce) => {
    if (!mots) return true;
    const categorie = getCategory(annonce.categorie)?.nom ?? "";
    return normaliser(`${annonce.titre} ${categorie} ${annonce.commune} ${annonce.ile}`).includes(mots);
  });
}

/** Une annonce par son identifiant, qu'elle soit de particulier ou de pro. */
export function getListing(id: string): Listing | undefined {
  return toutes.find((annonce) => annonce.id === id);
}

export function getListingIds(): string[] {
  return toutes.map((annonce) => annonce.id);
}

/**
 * Numéros de téléphone, tenus à part des annonces et des pros : ils ne doivent jamais
 * partir dans le HTML d'une page. Seul le bouton « Voir le numéro » les demande au serveur.
 * Numéros fictifs pour la démonstration.
 */
const telephonesParticuliers: Record<Listing["id"], string> = {
  "1": "87 00 00 01",
  "2": "87 00 00 02",
  "3": "87 00 00 03",
  "4": "87 00 00 04",
  "5": "87 00 00 05",
  "6": "87 00 00 06",
  "7": "87 00 00 07",
  "8": "87 00 00 08",
};

const telephonesPros: Record<Pro["slug"], string> = {
  "fare-plomberie": "40 00 00 01",
  "moana-auto": "40 00 00 02",
  "jardins-de-la-presquile": "40 00 00 03",
  "immo-motu": "40 00 00 04",
  "tech-fenua": "40 00 00 05",
  "atelier-tifaifai": "40 00 00 06",
};

export function getProPhone(slug: string): string | undefined {
  return telephonesPros[slug];
}

/** Numéro à appeler pour une annonce : celui du pro pour une annonce pro, sinon celui du particulier. */
export function getListingPhone(id: string): string | undefined {
  const annonce = getListing(id);
  if (!annonce) return undefined;
  return annonce.shopId ? getProPhone(annonce.shopId) : telephonesParticuliers[id];
}

/**
 * Autres annonces à proposer sous une annonce.
 * Annonce pro : les autres annonces de la même vitrine.
 * Annonce de particulier : celles de la même catégorie, puis les plus récentes, sans annonce pro.
 */
export function getRelatedListings(annonce: Listing, max = 3): Listing[] {
  if (annonce.shopId) {
    return getProListings(annonce.shopId)
      .filter((a) => a.id !== annonce.id)
      .slice(0, max);
  }
  const autres = listings.filter((a) => a.id !== annonce.id);
  const memeCategorie = autres.filter((a) => a.categorie === annonce.categorie);
  const reste = autres.filter((a) => a.categorie !== annonce.categorie);
  return [...memeCategorie, ...reste].slice(0, max);
}

/** Pros vérifiés. Avec une catégorie : ceux de cette catégorie, ou tous s'il n'y en a aucun. */
export function getVerifiedPros(categorie?: string): Pro[] {
  if (!categorie) return pros;
  const duSecteur = pros.filter((pro) => pro.categorie === categorie);
  return duSecteur.length > 0 ? duSecteur : pros;
}

/** Pros d'une catégorie exactement, sans repli : sert au filtre du marketplace. */
export function getProsByCategory(categorie: string): Pro[] {
  return pros.filter((pro) => pro.categorie === categorie);
}

/** Catégories qui ont au moins un pro, pour les filtres du marketplace. */
export function getProCategories(): Category[] {
  return categories.filter((c) => pros.some((pro) => pro.categorie === c.slug));
}

export function getPro(slug: string): Pro | undefined {
  return pros.find((pro) => pro.slug === slug);
}

export function getProSlugs(): string[] {
  return pros.map((pro) => pro.slug);
}

/** Annonces de la vitrine d'un pro, limitées à 20 annonces actives. */
export function getProListings(slug: string): Listing[] {
  return annoncesPro.filter((annonce) => annonce.shopId === slug).slice(0, MAX_ANNONCES_PRO);
}

/**
 * Annonces de particuliers d'une catégorie. Les annonces boostées passent en tête,
 * le reste garde l'ordre de publication (plus récentes d'abord).
 */
export function getCategoryListings(categorie: string): Listing[] {
  const annonces = listings.filter((annonce) => annonce.categorie === categorie);
  return [...annonces.filter((a) => a.boost), ...annonces.filter((a) => !a.boost)];
}
