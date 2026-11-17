/**
 * Tests de l'espace annonceur et des liens reçus par e-mail.
 *
 * Lancer : npm test (depuis le dossier web)
 *
 * La connexion elle-même passe par Supabase Auth : elle se vérifie dans le navigateur, pas ici.
 * Ces tests portent sur les règles pures de src/lib/accounts.ts et src/lib/redirection.ts.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  CONFIRMATION_GESTE,
  gestesPossibles,
  LIBELLE_GESTE,
  LIBELLE_STATUT,
  lireGeste,
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
  expire_le: "2026-12-16T12:00:00Z",
  categories: { slug: "vehicules" },
};

const dossier = join(import.meta.dirname, "..", "supabase", "migrations");
const migrations = readdirSync(dossier).sort().map((nom) => readFileSync(join(dossier, nom), "utf8")).join("\n");
/** Dernière version d'une fonction SQL (une migration peut la remplacer). */
const fonctionSql = (nom) => {
  const debut = Math.max(migrations.lastIndexOf(`create function public.${nom}(`), migrations.lastIndexOf(`create or replace function public.${nom}(`));
  return migrations.slice(debut, migrations.indexOf("$$;", debut));
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
      finLe: "16 décembre",
      gestes: ["vendue", "modifier", "retirer"],
    });
  });

  test("une annonce qui n'est pas active n'a pas de lien", () => {
    for (const statut of ["en_attente_validation", "refusee", "retiree", "vendue"]) {
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
    for (const statut of ["active", "en_attente_validation", "refusee", "retiree", "vendue", "expiree"]) {
      expect(LIBELLE_STATUT[statut], statut).toBeTruthy();
    }
  });

  test("le résumé compte les annonces actives, les vues et les contacts", () => {
    const annonces = [versSuivi(ligne, MAINTENANT), versSuivi({ ...ligne, id: 43, statut: "refusee" }, MAINTENANT)];
    expect(resumer(annonces)).toEqual({ actives: 1, vues: 0, contacts: 0, total: 2 });
  });
});

describe("vie d'une annonce : 30 jours, vendue, retirée, republiée (SPEC.md, 4 quinquies)", () => {
  test("une annonce active dont la date de fin est passée est expirée, sans lien public", () => {
    const expiree = versSuivi({ ...ligne, expire_le: "2026-11-15T12:00:00Z" }, MAINTENANT);
    expect(expiree.statut).toBe("expiree");
    expect(expiree.lien).toBeUndefined();
    expect(expiree.finLe).toBe("15 novembre");
  });

  test("une annonce expirée ne compte plus dans les 5 en ligne", () => {
    const annonces = [...Array.from({ length: 4 }, (_, i) => versSuivi({ ...ligne, id: i }, MAINTENANT)), versSuivi({ ...ligne, id: 9, expire_le: "2026-11-01T00:00:00Z" }, MAINTENANT)];
    expect(peutPublier({ type: "particulier" }, annonces)).toBe(true);
    expect(resumer(annonces).actives).toBe(4);
  });

  test("une annonce de vitrine, sans date de fin, reste en ligne", () => {
    expect(versSuivi({ ...ligne, expire_le: null }, MAINTENANT).statut).toBe("active");
  });

  test("chaque état propose un ou plusieurs gestes simples, le plus utile en premier", () => {
    expect(gestesPossibles("active")[0]).toBe("vendue");
    expect(gestesPossibles("en_attente_validation")).toEqual(["modifier", "retirer"]);
    expect(gestesPossibles("refusee")).toEqual(["modifier"]);
    for (const statut of ["vendue", "retiree", "expiree"]) expect(gestesPossibles(statut)[0], statut).toBe("republier");
    for (const statut of Object.keys(LIBELLE_STATUT)) {
      for (const geste of gestesPossibles(statut)) expect(LIBELLE_GESTE[geste], geste).toBeTruthy();
    }
  });

  test("seuls les gestes connus sont lus dans un formulaire", () => {
    expect(lireGeste("vendue")).toBe("vendue");
    expect(lireGeste("republier")).toBe("republier");
    for (const piege of ["modifier", "supprimer", "", null, undefined, 3]) expect(lireGeste(piege), String(piege)).toBeNull();
  });

  test("chaque résultat de la base a un message de confirmation", () => {
    for (const fait of ["vendue", "retiree", "active", "en_attente_validation", "modifiee"]) expect(CONFIRMATION_GESTE[fait], fait).toBeTruthy();
  });

  test("le public ne voit pas une annonce expirée, ni son numéro", () => {
    expect(migrations).toContain("(statut = 'active' and (expire_le is null or expire_le > now()))");
    expect(fonctionSql("voir_numero_annonce")).toContain("l.expire_le is null or l.expire_le > now()");
    expect(fonctionSql("rechercher_annonces")).toContain("l.expire_le is null or l.expire_le > now()");
  });

  test("la validation donne 30 jours aux annonces de particuliers", () => {
    expect(fonctionSql("moderer_annonce")).toContain("now() + interval '30 days'");
  });

  test("les gestes de l'annonceur ne portent que sur ses propres annonces", () => {
    expect(fonctionSql("gerer_annonce")).toContain("user_id = (select auth.uid())");
    expect(fonctionSql("modifier_annonce")).toContain("l.user_id = (select auth.uid())");
  });

  test("une annonce modifiée repasse en attente de validation", () => {
    const sql = fonctionSql("modifier_annonce");
    expect(sql).toContain("statut = 'en_attente_validation'");
    expect(sql).toContain("expire_le = null");
  });

  test("l'annonceur ne peut plus écrire directement dans ses annonces", () => {
    expect(migrations).toContain("revoke update (category_id, titre, description, prix_xpf, suffixe_prix, ile, commune) on public.listings from authenticated;");
  });

  test("une annonce republiée compte de nouveau dans la limite de 5", () => {
    const sql = fonctionSql("verifier_limite_annonces");
    expect(sql).toContain("deja_en_ligne");
    expect(migrations).toContain("before insert or update of statut, expire_le on public.listings");
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
