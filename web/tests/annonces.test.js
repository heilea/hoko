/**
 * Tests des règles de Hoko sur les annonces, les catégories et les pros.
 *
 * Lancer : npm test (depuis le dossier web)
 *
 * Les annonces et les vitrines sont lues dans Supabase. Ces tests portent sur les règles pures
 * de src/lib/annonces.ts (mise en forme, tri, choix des annonces proposées) et relisent les
 * fonctions SQL des migrations. Le comportement réel de la base a été essayé à part (recherche,
 * « Voir le numéro », règles d'accès).
 * La pagination (SPEC.md, section 4 bis) est testée en bas du fichier.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { bornes, lienPage, lirePage, nombrePages, numerosAffiches, PAR_PAGE_ACCUEIL, PAR_PAGE_CATEGORIE } from "../src/lib/pagination";
import {
  autresAnnonces,
  idAnnonceValide,
  libellePublication,
  nettoyerRecherche,
  prosDuSecteur,
  RECHERCHE_MAX,
  trierParBoost,
  versListing,
  versPro,
} from "../src/lib/annonces";
import { categories, getCategory } from "../src/lib/data";
import { normaliser, prixXpf, sigle } from "../src/lib/format";

const migrations = readdirSync(join(import.meta.dirname, "..", "supabase", "migrations"))
  .sort()
  .map((nom) => readFileSync(join(import.meta.dirname, "..", "supabase", "migrations", nom), "utf8"))
  .join("\n");
const fonctionSql = (nom) => {
  const debut = migrations.indexOf(`create function public.${nom}(`);
  return migrations.slice(debut, migrations.indexOf("$$;", debut));
};

/** Midi à Tahiti, le 16 novembre 2026 (Tahiti est à UTC-10). */
const MAINTENANT = Date.parse("2026-11-16T22:00:00Z");

/** Une annonce de particulier telle que la base la renvoie, à modifier dans chaque test. */
const ligne = {
  id: 7,
  titre: "Pirogue V1 carbone",
  description: "Pirogue V1 en carbone, très bon état.",
  prix_xpf: 180000,
  suffixe_prix: null,
  ile: "Tahiti",
  commune: "Punaauia",
  vendeur_nom: "Hinano",
  created_at: "2026-11-16T20:00:00Z",
  boost_jusqu_au: null,
  shop_id: null,
  categories: { slug: "nautisme" },
  shops: null,
};

const annonce = (id, modifs = {}) => ({ ...versListing({ ...ligne, id }, MAINTENANT), ...modifs });

describe("prix en XPF", () => {
  test("sépare les milliers par un espace et ajoute XPF", () => {
    // Les espaces sont insécables, pour que le prix ne soit jamais coupé en fin de ligne
    expect(prixXpf(220000)).toMatch(/^220\s000\sXPF$/);
    expect(prixXpf(2400000)).toMatch(/^2\s400\s000\sXPF$/);
  });

  test("n'affiche jamais de centimes", () => {
    expect(prixXpf(1500)).not.toMatch(/[.,]\d/);
  });
});

describe("outils de texte", () => {
  test("normaliser retire les accents et les majuscules", () => {
    expect(normaliser("Véhicules ÎLE")).toBe("vehicules ile");
  });

  test("sigle prend les initiales des deux premiers mots longs", () => {
    expect(sigle("Fare Plomberie")).toBe("FP");
  });
});

describe("catégories", () => {
  test("chaque catégorie a un nom, une icône et une description", () => {
    for (const c of categories) {
      expect(c.nom, c.slug).toBeTruthy();
      expect(c.icone, c.slug).toBeTruthy();
      expect(c.description, c.slug).toBeTruthy();
    }
  });

  test("une catégorie inconnue n'est pas trouvée", () => {
    expect(getCategory("inconnue")).toBeUndefined();
    expect(getCategory(undefined)).toBeUndefined();
  });
});

describe("annonce lue dans la base", () => {
  test("elle est mise au format des pages publiques", () => {
    expect(versListing(ligne, MAINTENANT)).toEqual({
      id: "7",
      titre: "Pirogue V1 carbone",
      description: "Pirogue V1 en carbone, très bon état.",
      prixXpf: 180000,
      suffixePrix: undefined,
      categorie: "nautisme",
      commune: "Punaauia",
      ile: "Tahiti",
      publiee: "aujourd'hui",
      boost: false,
      vendeur: "Hinano",
      shopId: undefined,
      photos: [],
    });
  });

  test("le boost est actif jusqu'à sa date de fin, pas après", () => {
    expect(versListing({ ...ligne, boost_jusqu_au: "2026-11-20T00:00:00Z" }, MAINTENANT).boost).toBe(true);
    expect(versListing({ ...ligne, boost_jusqu_au: "2026-11-10T00:00:00Z" }, MAINTENANT).boost).toBe(false);
  });

  test("une annonce pro n'est jamais boostée, et renvoie vers sa vitrine", () => {
    const pro = versListing({ ...ligne, shop_id: "uuid", shops: { slug: "moana-auto" }, boost_jusqu_au: "2027-01-01T00:00:00Z" }, MAINTENANT);
    expect(pro.boost).toBe(false);
    expect(pro.shopId).toBe("moana-auto");
  });

  test("une annonce pro dont la vitrine n'est pas en ligne n'est pas affichée", () => {
    expect(versListing({ ...ligne, shop_id: "uuid", shops: null }, MAINTENANT)).toBeNull();
  });

  test("aucune annonce ne porte de numéro de téléphone ni d'e-mail", () => {
    const texte = JSON.stringify(versListing(ligne, MAINTENANT));
    expect(texte).not.toMatch(/telephone|\d{2} \d{2} \d{2} \d{2}|@/);
  });
});

describe("date de publication, à l'heure de Tahiti", () => {
  test("aujourd'hui, hier, puis il y a quelques jours", () => {
    expect(libellePublication("2026-11-16T19:00:00Z", MAINTENANT)).toBe("aujourd'hui");
    expect(libellePublication("2026-11-15T20:00:00Z", MAINTENANT)).toBe("hier");
    expect(libellePublication("2026-11-13T20:00:00Z", MAINTENANT)).toBe("il y a 3 jours");
  });

  test("le jour change à minuit à Tahiti, pas à minuit UTC", () => {
    // 9 h à Tahiti le 16, mais encore le 15 à 23 h la veille à Tahiti pour 09:00 UTC le 16
    expect(libellePublication("2026-11-16T09:00:00Z", MAINTENANT)).toBe("hier");
  });

  test("au-delà d'une semaine, la date en toutes lettres", () => {
    expect(libellePublication("2026-11-02T20:00:00Z", MAINTENANT)).toBe("le 2 novembre");
  });
});

describe("pages d'une catégorie et d'une annonce", () => {
  test("les annonces boostées passent en tête, les autres gardent leur ordre", () => {
    const liste = [annonce(1), annonce(2, { boost: true }), annonce(3), annonce(4, { boost: true })];
    expect(trierParBoost(liste).map((a) => a.id)).toEqual(["2", "4", "1", "3"]);
  });

  test("les autres annonces commencent par la même catégorie, sans l'annonce affichée ni doublon", () => {
    const affichee = annonce(1);
    const memeCategorie = [annonce(1), annonce(2)];
    const recentes = [annonce(2), annonce(3), annonce(4), annonce(5)];
    expect(autresAnnonces(affichee, memeCategorie, recentes).map((a) => a.id)).toEqual(["2", "3", "4"]);
  });

  test("les autres annonces d'un particulier ne proposent jamais d'annonce pro", () => {
    const recentes = [annonce(2, { shopId: "moana-auto" }), annonce(3)];
    expect(autresAnnonces(annonce(1), [], recentes).map((a) => a.id)).toEqual(["3"]);
  });

  test("seul un identifiant numérique est lu dans la base", () => {
    expect(idAnnonceValide("42")).toBe(true);
    for (const id of ["0", "-1", "abc", "1.5", "", "1;drop", "99999999999999999999"]) {
      expect(idAnnonceValide(id), id).toBe(false);
    }
  });
});

describe("recherche", () => {
  test("le texte cherché est nettoyé et raccourci", () => {
    expect(nettoyerRecherche("  pirogue   carbone ")).toBe("pirogue carbone");
    expect(nettoyerRecherche(undefined)).toBe("");
    expect(nettoyerRecherche("x".repeat(200))).toHaveLength(RECHERCHE_MAX);
  });

  test("la base cherche sans accents ni majuscules, parmi les annonces de particuliers en ligne", () => {
    const sql = fonctionSql("rechercher_annonces");
    expect(sql).toContain("extensions.unaccent(lower(");
    expect(sql).toContain("l.statut = 'active'");
    expect(sql).toContain("l.shop_id is null");
  });

  test("un % ou un _ tapé par le visiteur est cherché tel quel", () => {
    expect(fonctionSql("rechercher_annonces")).toContain("'%', '\\%'");
  });
});

describe("contact du vendeur (bouton « Voir le numéro »)", () => {
  test("le numéro n'est donné que pour une annonce en ligne, et chaque demande est comptée", () => {
    const sql = fonctionSql("voir_numero_annonce");
    expect(sql).toContain("l.statut = 'active'");
    expect(sql).toContain("insert into public.contact_reveals");
  });

  test("le numéro d'une annonce pro est celui de la vitrine, si elle est en ligne", () => {
    const sql = fonctionSql("voir_numero_annonce");
    expect(sql).toContain("coalesce(sp.telephone, p.telephone)");
    expect(sql).toContain("s.statut = 'actif' and s.verifie");
  });

  test("le numéro d'une vitrine n'est donné que si elle est active et vérifiée", () => {
    const sql = fonctionSql("voir_numero_vitrine");
    expect(sql).toContain("s.statut = 'actif'");
    expect(sql).toContain("and s.verifie");
  });
});

describe("annuaire des pros", () => {
  const pros = ["vehicules", "services", "services"].map((categorie, i) =>
    versPro({ slug: `pro-${i}`, nom: `Pro ${i}`, secteur: "Secteur", ile: "Tahiti", commune: "Papeete", presentation: "", horaires: [], categories: { slug: categorie } }),
  );

  test("sans catégorie, tous les pros sont listés", () => {
    expect(prosDuSecteur(pros)).toHaveLength(3);
  });

  test("dans une catégorie qui a des pros, seuls ceux-là sont listés", () => {
    expect(prosDuSecteur(pros, "services").map((p) => p.slug)).toEqual(["pro-1", "pro-2"]);
  });

  test("dans une catégorie sans pro, tout l'annuaire est montré", () => {
    expect(prosDuSecteur(pros, "mode")).toHaveLength(3);
  });
});

describe("pagination des annonces (SPEC.md, section 4 bis)", () => {
  const source = (chemin) => readFileSync(join(import.meta.dirname, "..", "src", ...chemin.split("/")), "utf8");
  const donnees = source("lib/annonces-donnees.ts");
  const fonction = (nom) => {
    const debut = donnees.indexOf(`export async function ${nom}(`);
    const reste = donnees.slice(debut);
    return reste.slice(0, reste.search(/\r?\n\}\r?\n/));
  };

  test("une page de catégorie lit 20 annonces, l'accueil et la recherche 12", () => {
    expect(PAR_PAGE_CATEGORIE).toBe(20);
    expect(PAR_PAGE_ACCUEIL).toBe(12);
    expect(fonction("getCategoryListings")).toContain("bornes(page, PAR_PAGE_CATEGORIE)");
    expect(fonction("searchListings")).toContain("bornes(page, PAR_PAGE_ACCUEIL)");
    expect(bornes(1, 20)).toEqual({ debut: 0, fin: 19 });
  });

  test("?page=2 affiche les annonces suivantes, sans doublon avec la page 1", () => {
    const p1 = bornes(1, 20);
    const p2 = bornes(2, 20);
    expect(p2.debut).toBe(p1.fin + 1);
    expect(p2).toEqual({ debut: 20, fin: 39 });
  });

  test("seules les annonces de la page demandée sont lues dans la base", () => {
    expect(fonction("searchListings").match(/\.range\(debut, fin\)/g)).toHaveLength(2);
    expect(fonction("getCategoryListings")).toContain(".range(debut, fin)");
    expect(donnees).not.toContain(".limit(LIMITE_LISTE)");
  });

  test("les annonces boostées sont en tête de la page 1 et ne reviennent pas sur les pages suivantes", () => {
    const categorie = fonction("getCategoryListings");
    expect(categorie).toContain('.gt("boost_jusqu_au", maintenant)');
    expect(categorie).toContain("boost_jusqu_au.is.null,boost_jusqu_au.lte.");
    expect(categorie).toContain("page === 1 ? [...(boostees.data ?? []), ...(autres.data ?? [])] : autres.data");
  });

  test("une page au-delà de la dernière affiche « Page introuvable »", () => {
    expect(nombrePages(0, 20)).toBe(1);
    expect(nombrePages(20, 20)).toBe(1);
    expect(nombrePages(21, 20)).toBe(2);
    expect(source("app/page.tsx")).toContain("if (page > liste.pages) notFound();");
    expect(source("app/categories/[slug]/page.tsx")).toContain("if (liste.page > liste.pages) notFound();");
  });

  test("?page=abc, ?page=0 et ?page=-1 sont traités comme la page 1", () => {
    for (const piege of ["abc", "0", "-1", "1.5", "", undefined, "99999999", " 2"]) expect(lirePage(piege)).toBe(1);
    expect(lirePage("3")).toBe(3);
    expect(lirePage(["4", "5"])).toBe(4);
  });

  test("la recherche garde le mot cherché d'une page à l'autre (?q=pirogue&page=2)", () => {
    expect(lienPage("/", 2, "pirogue")).toBe("/?q=pirogue&page=2#annonces");
    expect(lienPage("/", 1, "pirogue")).toBe("/?q=pirogue#annonces");
    expect(lienPage("/categories/vehicules", 3)).toBe("/categories/vehicules?page=3#annonces");
    expect(lienPage("/categories/vehicules", 1)).toBe("/categories/vehicules#annonces");
  });

  test("l'accueil est trié par date de création seulement : une annonce boostée n'y passe pas en tête", () => {
    const accueil = fonction("searchListings");
    expect(accueil).toContain('.order("created_at", { ascending: false })');
    expect(accueil).not.toContain("boost");
  });

  test("l'accueil et la recherche n'affichent pas le badge « Boost »", () => {
    expect(source("app/page.tsx")).toContain("<ListingCard key={annonce.id} annonce={annonce} sansBoost />");
  });

  test("numéros de page : la première, la dernière et les voisines, « … » pour les trous", () => {
    expect(numerosAffiches(1, 1)).toEqual([1]);
    expect(numerosAffiches(1, 3)).toEqual([1, 2, 3]);
    expect(numerosAffiches(5, 12)).toEqual([1, "…", 4, 5, 6, "…", 12]);
    expect(numerosAffiches(3, 12)).toEqual([1, 2, 3, 4, "…", 12]);
    expect(numerosAffiches(12, 12)).toEqual([1, "…", 11, 12]);
  });

  test("les liens « Précédent » et « Suivant » n'apparaissent que s'il y a une page avant ou après", () => {
    const composant = source("components/Pagination.tsx");
    expect(composant).toContain("if (pages <= 1) return null;");
    expect(composant).toContain("{page > 1 && (");
    expect(composant).toContain("{page < pages && (");
  });
});
