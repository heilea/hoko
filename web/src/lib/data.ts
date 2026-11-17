/**
 * Types, catégories et limites de Hoko.
 *
 * Les annonces et les vitrines sont lues dans Supabase (`annonces-donnees.ts`). Les anciennes
 * données d'exemple sont devenues le contenu de la démo client : `supabase/demo/donnees-demo.sql`.
 *
 * Catégories : à confirmer (SPEC.md, points à décider). La même liste est dans la base
 * (migration « schema ») ; `tests/schema.test.js` vérifie qu'elles restent identiques.
 */
import type { Photo } from "./photos";

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
  /** Libellé de date (« hier », « il y a 3 jours »), calculé à partir de la date de publication. */
  publiee: string;
  /** Boost actif : l'annonce remonte en tête de sa catégorie pendant 7 jours. */
  boost: boolean;
  /** Prénom du vendeur, ou nom du pro. Son numéro est servi à part, voir getListingPhone. */
  vendeur: string;
  /** Photos dans l'ordre : la première sert de vignette. */
  photos: Photo[];
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

/**
 * Un particulier ne peut pas avoir plus de 5 annonces actives : cela évite les annonces sans
 * intérêt et empêche un professionnel de se faire passer pour un particulier.
 */
export const MAX_ANNONCES_PARTICULIER = 5;

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

export function getCategory(slug: string | undefined): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
