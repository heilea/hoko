/**
 * Lecture, dans Supabase, des annonces et des vitrines publiques.
 *
 * Ces lectures se font comme un visiteur (clé publique, sans session) : les règles d'accès de
 * la base ne renvoient que les annonces en ligne et les vitrines actives et vérifiées.
 * Elles sont mises en cache (« use cache ») quelques minutes, et vidées dès qu'une annonce est
 * validée ou refusée (`updateTag` dans l'action de l'administrateur).
 */
import { cacheLife, cacheTag } from "next/cache";
import {
  autresAnnonces,
  idAnnonceValide,
  nettoyerRecherche,
  prosDuSecteur,
  versListing,
  versPro,
  type LigneListing,
} from "./annonces";
import type { Listing, Pro } from "./data";
import { MAX_ANNONCES_PRO } from "./data";
import { bornes, nombrePages, PAR_PAGE_ACCUEIL, PAR_PAGE_CATEGORIE } from "./pagination";
import { getSupabase } from "./supabase";

/** Étiquettes de cache : à vider quand les annonces ou les vitrines changent. */
export const TAG_ANNONCES = "annonces";
export const TAG_VITRINES = "vitrines";

/** Une page d'une liste d'annonces (SPEC.md, 4 bis). `total` compte toutes les pages. */
export type PageAnnonces = { annonces: Listing[]; total: number; page: number; pages: number };

const PAGE_VIDE: PageAnnonces = { annonces: [], total: 0, page: 1, pages: 1 };

const COLONNES =
  "id, titre, description, prix_xpf, suffixe_prix, ile, commune, vendeur_nom, created_at, boost_jusqu_au, shop_id, categories(slug), shops(slug), photos(id, chemin, ordre)";
const COLONNES_VITRINE = "slug, nom, secteur, ile, commune, presentation, horaires, categories(slug)";

function enAnnonces(lignes: LigneListing[] | null): Listing[] {
  const maintenant = Date.now();
  return (lignes ?? []).flatMap((ligne) => versListing(ligne, maintenant) ?? []);
}

/**
 * Annonces de particuliers en ligne, les plus récentes d'abord, 12 par page. Avec une recherche :
 * celles dont le titre, la catégorie, la commune ou l'île contient le texte, accents et
 * majuscules ignorés (fonction `rechercher_annonces` de la base). Les annonces pro n'y figurent
 * jamais. Le boost ne change rien ici : il ne joue que dans la catégorie de l'annonce.
 */
export async function searchListings(q?: string, page = 1): Promise<PageAnnonces> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAG_ANNONCES);
  const supabase = getSupabase();
  if (!supabase) return PAGE_VIDE;
  const recherche = nettoyerRecherche(q);
  const { debut, fin } = bornes(page, PAR_PAGE_ACCUEIL);
  const { data, count } = recherche
    ? await supabase.rpc("rechercher_annonces", { recherche }, { count: "exact" }).select(COLONNES).range(debut, fin)
    : await supabase
        .from("listings")
        .select(COLONNES, { count: "exact" })
        .eq("statut", "active")
        .is("shop_id", null)
        .order("created_at", { ascending: false })
        .range(debut, fin);
  const total = count ?? 0;
  return { annonces: enAnnonces(data), total, page, pages: nombrePages(total, PAR_PAGE_ACCUEIL) };
}

/** Une annonce en ligne par son identifiant, qu'elle soit de particulier ou de pro. */
export async function getListing(id: string): Promise<Listing | undefined> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAG_ANNONCES);
  const supabase = getSupabase();
  if (!supabase || !idAnnonceValide(id)) return undefined;
  const { data } = await supabase.from("listings").select(COLONNES).eq("id", Number(id)).eq("statut", "active").maybeSingle();
  return enAnnonces(data ? [data] : [])[0];
}

/**
 * Annonces de particuliers d'une catégorie, 20 par page, les plus récentes d'abord. Les annonces
 * boostées (3 au plus) sont en tête de la page 1 en plus des 20, et ne reviennent pas ensuite.
 */
export async function getCategoryListings(categorie: string, page = 1): Promise<PageAnnonces> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAG_ANNONCES);
  const supabase = getSupabase();
  if (!supabase) return PAGE_VIDE;
  const maintenant = new Date().toISOString();
  const { debut, fin } = bornes(page, PAR_PAGE_CATEGORIE);
  const enLigne = () =>
    supabase
      .from("listings")
      .select(`${COLONNES}, categorie:categories!inner(slug)`, { count: "exact" })
      .eq("categorie.slug", categorie)
      .eq("statut", "active")
      .is("shop_id", null)
      .order("created_at", { ascending: false });
  const [boostees, autres] = await Promise.all([
    enLigne().gt("boost_jusqu_au", maintenant).limit(10),
    enLigne().or(`boost_jusqu_au.is.null,boost_jusqu_au.lte.${maintenant}`).range(debut, fin),
  ]);
  const total = (boostees.count ?? 0) + (autres.count ?? 0);
  const annonces = enAnnonces(page === 1 ? [...(boostees.data ?? []), ...(autres.data ?? [])] : autres.data);
  return { annonces, total, page, pages: nombrePages(autres.count ?? 0, PAR_PAGE_CATEGORIE) };
}

/** Annonces d'une vitrine, 20 au plus. */
export async function getProListings(slug: string): Promise<Listing[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAG_ANNONCES, TAG_VITRINES);
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("listings")
    .select(`${COLONNES}, vitrine:shops!inner(slug)`)
    .eq("vitrine.slug", slug)
    .eq("statut", "active")
    .order("created_at", { ascending: false })
    .limit(MAX_ANNONCES_PRO);
  return enAnnonces(data);
}

/**
 * Autres annonces à proposer sous une annonce.
 * Annonce pro : les autres annonces de la même vitrine.
 * Annonce de particulier : celles de la même catégorie, puis les plus récentes, sans annonce pro.
 */
export async function getRelatedListings(annonce: Listing, max = 3): Promise<Listing[]> {
  if (annonce.shopId) {
    return (await getProListings(annonce.shopId)).filter((a) => a.id !== annonce.id).slice(0, max);
  }
  const [memeCategorie, recentes] = await Promise.all([getCategoryListings(annonce.categorie), searchListings()]);
  return autresAnnonces(annonce, memeCategorie.annonces, recentes.annonces, max);
}

/** Toutes les vitrines en ligne (actives et vérifiées), par ordre alphabétique. */
async function getVitrines(): Promise<Pro[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAG_VITRINES);
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("shops").select(COLONNES_VITRINE).order("nom");
  return (data ?? []).map(versPro);
}

/** Pros vérifiés. Avec une catégorie : ceux de cette catégorie, ou tous s'il n'y en a aucun. */
export async function getVerifiedPros(categorie?: string): Promise<Pro[]> {
  return prosDuSecteur(await getVitrines(), categorie);
}

/** Pros d'une catégorie exactement, sans repli : sert au filtre du marketplace. */
export async function getProsByCategory(categorie: string): Promise<Pro[]> {
  return (await getVitrines()).filter((pro) => pro.categorie === categorie);
}

/** Slugs des catégories qui ont au moins un pro, pour les filtres du marketplace. */
export async function getProCategorySlugs(): Promise<string[]> {
  return [...new Set((await getVitrines()).map((pro) => pro.categorie))];
}

export async function getPro(slug: string): Promise<Pro | undefined> {
  return (await getVitrines()).find((pro) => pro.slug === slug);
}

