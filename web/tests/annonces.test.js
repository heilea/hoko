/**
 * Tests des règles de Hoko sur les annonces, les catégories et les pros.
 *
 * Lancer : npm test (depuis le dossier web)
 *
 * Ces tests portent sur les données d'exemple de src/lib/data.ts. Ils servent de filet
 * de sécurité : si une règle casse lors d'une prochaine modification, un test échoue.
 * Les tests marqués « todo » décrivent la pagination, décidée mais pas encore construite
 * (SPEC.md, section 4 bis). Ils sont à transformer en vrais tests le jour où elle l'est.
 */
import { describe, expect, test } from "vitest";
import {
  categories,
  getCategory,
  getCategoryListings,
  getListing,
  getListingIds,
  getListingPhone,
  getPro,
  getProCategories,
  getProListings,
  getProPhone,
  getProsByCategory,
  getProSlugs,
  getRelatedListings,
  getVerifiedPros,
  MAX_ANNONCES_PRO,
  searchListings,
} from "../src/lib/data";
import { normaliser, prixXpf, sigle } from "../src/lib/format";

const ESPACE = " "; // espace insécable, pour que le prix ne se coupe pas en fin de ligne

describe("prix en XPF", () => {
  test("sépare les milliers par un espace et ajoute XPF", () => {
    expect(prixXpf(700)).toBe(`700${ESPACE}XPF`);
    expect(prixXpf(10000)).toBe(`10${ESPACE}000${ESPACE}XPF`);
    expect(prixXpf(2400000)).toBe(`2${ESPACE}400${ESPACE}000${ESPACE}XPF`);
  });

  test("n'affiche jamais de centimes", () => {
    expect(prixXpf(699.6)).toBe(`700${ESPACE}XPF`);
    expect(prixXpf(1500.2)).toBe(`1${ESPACE}500${ESPACE}XPF`);
  });

  test("toutes les annonces ont un prix entier et positif", () => {
    for (const id of getListingIds()) {
      const annonce = getListing(id);
      expect(Number.isInteger(annonce.prixXpf), `annonce ${id}`).toBe(true);
      expect(annonce.prixXpf, `annonce ${id}`).toBeGreaterThan(0);
    }
  });
});

describe("outils de texte", () => {
  test("normaliser retire les accents et les majuscules", () => {
    expect(normaliser("Véhicules")).toBe("vehicules");
    expect(normaliser("Presqu'île")).toBe("presqu'ile");
  });

  test("sigle prend les initiales des deux premiers mots longs", () => {
    expect(sigle("Fare Plomberie")).toBe("FP");
    expect(sigle("Jardins de la Presqu'île")).toBe("JP");
  });
});

describe("recherche d'annonces", () => {
  test("sans mot, toutes les annonces de particuliers sont renvoyées", () => {
    const particuliers = getListingIds().filter((id) => !getListing(id).shopId);
    expect(searchListings()).toHaveLength(particuliers.length);
    expect(searchListings("   ")).toHaveLength(particuliers.length);
  });

  test("trouve une annonce par un mot de son titre", () => {
    const resultats = searchListings("pirogue");
    expect(resultats).toHaveLength(1);
    expect(resultats[0].titre).toContain("Pirogue");
  });

  test("ignore les accents et les majuscules", () => {
    expect(searchListings("UKULELE")).toHaveLength(1);
    expect(searchListings("ukulélé")).toHaveLength(1);
  });

  test("cherche aussi dans la catégorie et dans le lieu", () => {
    expect(searchListings("vehicules").every((a) => a.categorie === "vehicules")).toBe(true);
    expect(searchListings("vehicules").length).toBeGreaterThan(0);
    expect(searchListings("moorea").every((a) => a.ile === "Moorea")).toBe(true);
    expect(searchListings("moorea").length).toBeGreaterThan(0);
  });

  test("ne renvoie rien pour un mot absent", () => {
    expect(searchListings("zzzzz")).toEqual([]);
  });
});

describe("page d'une catégorie", () => {
  test("chaque annonce appartient à une catégorie qui existe", () => {
    for (const id of getListingIds()) {
      expect(getCategory(getListing(id).categorie), `annonce ${id}`).toBeDefined();
    }
  });

  test("chaque catégorie a un nom, une icône et une description", () => {
    for (const categorie of categories) {
      expect(categorie.nom, categorie.slug).toBeTruthy();
      expect(categorie.icone, categorie.slug).toBeTruthy();
      expect(categorie.description, categorie.slug).toBeTruthy();
    }
  });

  test("ne liste que les annonces de la catégorie", () => {
    const annonces = getCategoryListings("vehicules");
    expect(annonces.length).toBeGreaterThan(0);
    expect(annonces.every((a) => a.categorie === "vehicules")).toBe(true);
  });

  test("les annonces boostées passent en tête de liste", () => {
    for (const categorie of categories) {
      const annonces = getCategoryListings(categorie.slug);
      const premiereNonBoostee = annonces.findIndex((a) => !a.boost);
      if (premiereNonBoostee === -1) continue;
      const boosteeApres = annonces.slice(premiereNonBoostee).some((a) => a.boost);
      expect(boosteeApres, categorie.slug).toBe(false);
    }
  });

  test("une catégorie sans annonce renvoie une liste vide", () => {
    expect(getCategoryListings("emploi")).toEqual([]);
    expect(getCategoryListings("categorie-inconnue")).toEqual([]);
  });
});

describe("page d'une annonce", () => {
  test("une annonce inconnue n'est pas trouvée", () => {
    expect(getListing("999")).toBeUndefined();
  });

  test("les autres annonces excluent l'annonce affichée et sont trois au plus", () => {
    const annonce = getListing("1");
    const autres = getRelatedListings(annonce);
    expect(autres.length).toBeLessThanOrEqual(3);
    expect(autres.some((a) => a.id === annonce.id)).toBe(false);
  });

  test("les autres annonces commencent par celles de la même catégorie", () => {
    const annonce = getListing("1"); // Véhicules
    expect(getRelatedListings(annonce)[0].categorie).toBe(annonce.categorie);
  });
});

describe("contact du vendeur (bouton « Voir le numéro »)", () => {
  test("chaque annonce a un numéro de téléphone", () => {
    for (const id of getListingIds()) {
      expect(getListingPhone(id), `annonce ${id}`).toMatch(/^\d{2}( \d{2}){3}$/);
    }
  });

  test("le numéro n'est jamais porté par l'annonce elle-même", () => {
    // L'annonce part dans la page : si le numéro y figurait, il serait visible avant le clic.
    for (const id of getListingIds()) {
      const contenu = JSON.stringify(getListing(id));
      const numero = getListingPhone(id);
      expect(contenu.includes(numero), `annonce ${id}`).toBe(false);
      expect(contenu.includes(numero.replace(/\s/g, "")), `annonce ${id}`).toBe(false);
    }
  });

  test("aucune annonce n'expose d'adresse e-mail", () => {
    for (const id of getListingIds()) {
      expect(JSON.stringify(getListing(id)), `annonce ${id}`).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    }
  });

  test("une annonce inconnue n'a pas de numéro", () => {
    expect(getListingPhone("999")).toBeUndefined();
  });
});

describe("annuaire des pros", () => {
  test("sans catégorie, tous les pros sont listés", () => {
    expect(getVerifiedPros().length).toBeGreaterThan(0);
  });

  test("dans une catégorie qui a des pros, seuls ceux-là sont listés", () => {
    const pros = getVerifiedPros("services");
    expect(pros.length).toBeGreaterThan(0);
    expect(pros.every((pro) => pro.categorie === "services")).toBe(true);
  });

  test("dans une catégorie sans pro, tout l'annuaire est montré", () => {
    expect(getVerifiedPros("emploi")).toEqual(getVerifiedPros());
  });

});

describe("annonces pro et vitrines", () => {
  const annoncesPro = getListingIds()
    .map((id) => getListing(id))
    .filter((annonce) => annonce.shopId);

  test("il existe des annonces pro dans les données", () => {
    expect(annoncesPro.length).toBeGreaterThan(0);
  });

  test("la recherche ne renvoie jamais d'annonce pro", () => {
    expect(searchListings().some((a) => a.shopId)).toBe(false);
    // « chauffe-eau » n'existe que dans une annonce pro
    expect(searchListings("chauffe-eau")).toEqual([]);
  });

  test("les pages de catégorie ne listent jamais d'annonce pro", () => {
    for (const categorie of categories) {
      expect(getCategoryListings(categorie.slug).some((a) => a.shopId), categorie.slug).toBe(false);
    }
  });

  test("les autres annonces d'un particulier ne proposent pas d'annonce pro", () => {
    expect(getRelatedListings(getListing("1")).some((a) => a.shopId)).toBe(false);
  });

  test("les autres annonces d'une annonce pro viennent de la même vitrine", () => {
    const annonce = annoncesPro[0];
    const autres = getRelatedListings(annonce);
    expect(autres.length).toBeGreaterThan(0);
    expect(autres.every((a) => a.shopId === annonce.shopId)).toBe(true);
    expect(autres.some((a) => a.id === annonce.id)).toBe(false);
  });

  test("un pro ne peut pas booster : aucune annonce pro n'est boostée", () => {
    expect(annoncesPro.some((a) => a.boost)).toBe(false);
  });

  test("chaque annonce pro appartient à une vitrine qui existe", () => {
    for (const annonce of annoncesPro) {
      expect(getPro(annonce.shopId), `annonce ${annonce.id}`).toBeDefined();
    }
  });

  test("une vitrine ne montre que ses annonces, 20 au plus", () => {
    expect(MAX_ANNONCES_PRO).toBe(20);
    for (const slug of getProSlugs()) {
      const annonces = getProListings(slug);
      expect(annonces.length, slug).toBeLessThanOrEqual(MAX_ANNONCES_PRO);
      expect(annonces.every((a) => a.shopId === slug), slug).toBe(true);
    }
  });

  test("chaque vitrine a une présentation, des horaires et un numéro de téléphone", () => {
    for (const slug of getProSlugs()) {
      const pro = getPro(slug);
      expect(pro.presentation, slug).toBeTruthy();
      expect(pro.horaires.length, slug).toBeGreaterThan(0);
      expect(getProPhone(slug), slug).toMatch(/^\d{2}( \d{2}){3}$/);
    }
  });

  test("le numéro du pro n'est jamais porté par sa fiche", () => {
    for (const slug of getProSlugs()) {
      expect(JSON.stringify(getPro(slug)).includes(getProPhone(slug)), slug).toBe(false);
    }
  });

  test("le numéro d'une annonce pro est celui du pro", () => {
    for (const annonce of annoncesPro) {
      expect(getListingPhone(annonce.id), `annonce ${annonce.id}`).toBe(getProPhone(annonce.shopId));
    }
  });

  test("le filtre par secteur du marketplace ne renvoie que les pros du secteur", () => {
    for (const categorie of getProCategories()) {
      const pros = getProsByCategory(categorie.slug);
      expect(pros.length, categorie.slug).toBeGreaterThan(0);
      expect(pros.every((pro) => pro.categorie === categorie.slug), categorie.slug).toBe(true);
    }
    expect(getProsByCategory("emploi")).toEqual([]);
  });

  test("une vitrine inconnue n'est pas trouvée", () => {
    expect(getPro("vitrine-inconnue")).toBeUndefined();
    expect(getProListings("vitrine-inconnue")).toEqual([]);
    expect(getProPhone("vitrine-inconnue")).toBeUndefined();
  });
});

describe("pagination des annonces (SPEC.md, section 4 bis)", () => {
  test.todo("une page de catégorie affiche au plus 20 annonces");
  test.todo("?page=2 affiche les annonces suivantes, sans doublon avec la page 1");
  test.todo("les annonces boostées sont en tête de la page 1 et ne reviennent pas sur les pages suivantes");
  test.todo("une page au-delà de la dernière affiche « Page introuvable »");
  test.todo("?page=abc, ?page=0 et ?page=-1 sont traités comme la page 1");
  test.todo("la recherche garde le mot cherché d'une page à l'autre (?q=pirogue&page=2)");
  test.todo("l'accueil affiche 10 à 12 annonces par page");
  test.todo("l'accueil est trié par date de création seulement : une annonce boostée n'y passe pas en tête");
  test.todo("l'accueil et la recherche n'affichent pas le badge « Boost »");
  test.todo("les liens « Précédent » et « Suivant » n'apparaissent que s'il y a une page avant ou après");
});
