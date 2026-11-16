/**
 * Tests de l'espace annonceur et des liens reçus par e-mail.
 *
 * Lancer : npm test (depuis le dossier web)
 *
 * La connexion elle-même passe par Supabase Auth : elle se vérifie dans le navigateur, pas ici.
 * Ces tests portent sur les règles pures de src/lib/accounts.ts et src/lib/redirection.ts.
 */
import { describe, expect, test } from "vitest";
import {
  LIBELLE_STATUT,
  lireStatutAnnonce,
  lireStatutVitrine,
  maximumAnnonces,
  peutPublier,
  resumer,
  versSuivi,
} from "../src/lib/accounts";
import { MAX_ANNONCES_PARTICULIER, MAX_ANNONCES_PRO } from "../src/lib/data";
import { cheminDeRetour } from "../src/lib/redirection";

const MAINTENANT = Date.parse("2026-11-16T12:00:00Z");
const actives = (n) => Array.from({ length: n }, () => ({ statut: "active" }));

/** Une annonce telle que la base la renvoie, à modifier dans chaque test. */
const ligne = {
  id: 42,
  titre: "Scooter 125 cm³",
  prix_xpf: 220000,
  statut: "active",
  boost_jusqu_au: null,
  motif_refus: null,
  categories: { slug: "vehicules" },
};

describe("limite d'annonces actives", () => {
  test("un particulier a droit à 5 annonces actives, un pro à 20", () => {
    expect(MAX_ANNONCES_PARTICULIER).toBe(5);
    expect(maximumAnnonces({ type: "particulier" })).toBe(5);
    expect(maximumAnnonces({ type: "pro" })).toBe(MAX_ANNONCES_PRO);
  });

  test("un particulier peut publier tant qu'il a moins de 5 annonces actives", () => {
    const particulier = { type: "particulier" };
    expect(peutPublier(particulier, [])).toBe(true);
    expect(peutPublier(particulier, actives(4))).toBe(true);
    expect(peutPublier(particulier, actives(5))).toBe(false);
    expect(peutPublier(particulier, actives(6))).toBe(false);
  });

  test("les annonces refusées, retirées ou en attente ne comptent pas dans les 5", () => {
    const annonces = [...actives(4), { statut: "refusee" }, { statut: "retiree" }, { statut: "en_attente_validation" }];
    expect(peutPublier({ type: "particulier" }, annonces)).toBe(true);
  });
});

describe("annonces de la base dans l'espace annonceur", () => {
  test("une annonce active a un lien vers sa page publique", () => {
    expect(versSuivi(ligne, MAINTENANT)).toEqual({
      id: "42",
      titre: "Scooter 125 cm³",
      prixXpf: 220000,
      categorie: "vehicules",
      statut: "active",
      boost: "aucun",
      vues: 0,
      contacts: 0,
      lien: "/annonces/42",
      motif: undefined,
    });
  });

  test("une annonce qui n'est pas active n'a pas de lien", () => {
    for (const statut of ["en_attente_validation", "refusee", "retiree"]) {
      expect(versSuivi({ ...ligne, statut }, MAINTENANT).lien, statut).toBeUndefined();
    }
  });

  test("le motif de refus n'est montré que pour une annonce refusée", () => {
    expect(versSuivi({ ...ligne, statut: "refusee", motif_refus: "Photos manquantes" }, MAINTENANT).motif).toBe("Photos manquantes");
    expect(versSuivi({ ...ligne, statut: "active", motif_refus: "Ancien motif" }, MAINTENANT).motif).toBeUndefined();
  });

  test("le boost est actif jusqu'à sa date de fin, pas après", () => {
    expect(versSuivi({ ...ligne, boost_jusqu_au: "2026-11-20T00:00:00Z" }, MAINTENANT).boost).toBe("actif");
    expect(versSuivi({ ...ligne, boost_jusqu_au: "2026-11-10T00:00:00Z" }, MAINTENANT).boost).toBe("aucun");
  });

  test("un statut inconnu venu de la base n'est jamais traité comme en ligne", () => {
    expect(lireStatutAnnonce("active")).toBe("active");
    expect(lireStatutAnnonce("publiee")).toBe("en_attente_validation");
    expect(versSuivi({ ...ligne, statut: "publiee" }, MAINTENANT).lien).toBeUndefined();
    expect(lireStatutVitrine("actif")).toBe("actif");
    expect(lireStatutVitrine("ouverte")).toBe("en_attente_paiement");
  });

  test("chaque statut de la base a un libellé", () => {
    for (const statut of ["active", "en_attente_validation", "refusee", "retiree"]) {
      expect(LIBELLE_STATUT[statut], statut).toBeTruthy();
    }
  });

  test("le résumé compte les annonces actives, les vues et les contacts", () => {
    const annonces = [versSuivi(ligne, MAINTENANT), versSuivi({ ...ligne, id: 43, statut: "refusee" }, MAINTENANT)];
    expect(resumer(annonces)).toEqual({ actives: 1, vues: 0, contacts: 0, total: 2 });
  });
});

describe("retour après un lien reçu par e-mail", () => {
  test("une page du site est acceptée", () => {
    expect(cheminDeRetour("/compte")).toBe("/compte");
    expect(cheminDeRetour("/mot-de-passe/nouveau")).toBe("/mot-de-passe/nouveau");
  });

  test("une adresse vers un autre site est remplacée par l'espace annonceur", () => {
    for (const piege of ["//exemple.com", "https://exemple.com", "/\\exemple.com", "\\\\exemple.com", "exemple.com", "/ x", "", null, undefined]) {
      expect(cheminDeRetour(piege), String(piege)).toBe("/compte");
    }
  });
});
