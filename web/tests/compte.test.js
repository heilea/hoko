/**
 * Tests de la connexion et de l'espace annonceur.
 *
 * Lancer : npm test (depuis le dossier web)
 */
import { describe, expect, test } from "vitest";
import {
  getAccount,
  getAccountListings,
  getComptesDemo,
  getVitrine,
  resumer,
  verifierIdentifiants,
} from "../src/lib/accounts";
import { getListing, MAX_ANNONCES_PRO } from "../src/lib/data";
import { creerJeton, DUREE_SESSION_MS, lireJeton } from "../src/lib/session-token";

const SECRET = "secret-de-test";
const MAINTENANT = 1_800_000_000_000;

describe("jeton de session", () => {
  test("un jeton valide redonne l'identifiant du compte", () => {
    const jeton = creerJeton("teva", SECRET, MAINTENANT);
    expect(lireJeton(jeton, SECRET, MAINTENANT + 1000)).toBe("teva");
  });

  test("un jeton expire au bout de 7 jours", () => {
    const jeton = creerJeton("teva", SECRET, MAINTENANT);
    expect(lireJeton(jeton, SECRET, MAINTENANT + DUREE_SESSION_MS - 1)).toBe("teva");
    expect(lireJeton(jeton, SECRET, MAINTENANT + DUREE_SESSION_MS)).toBeNull();
  });

  test("on ne peut pas changer le compte d'un jeton", () => {
    const [, expiration, signature] = creerJeton("teva", SECRET, MAINTENANT).split(".");
    expect(lireJeton(`moana-auto.${expiration}.${signature}`, SECRET, MAINTENANT)).toBeNull();
  });

  test("on ne peut pas prolonger un jeton", () => {
    const [compte, expiration, signature] = creerJeton("teva", SECRET, MAINTENANT).split(".");
    expect(lireJeton(`${compte}.${Number(expiration) + 1000}.${signature}`, SECRET, MAINTENANT)).toBeNull();
  });

  test("un jeton signé avec un autre secret est refusé", () => {
    const jeton = creerJeton("teva", "autre-secret", MAINTENANT);
    expect(lireJeton(jeton, SECRET, MAINTENANT)).toBeNull();
  });

  test("un jeton absent ou mal formé est refusé", () => {
    expect(lireJeton(undefined, SECRET, MAINTENANT)).toBeNull();
    expect(lireJeton("", SECRET, MAINTENANT)).toBeNull();
    expect(lireJeton("teva", SECRET, MAINTENANT)).toBeNull();
    expect(lireJeton("teva.123", SECRET, MAINTENANT)).toBeNull();
    expect(lireJeton("a.b.c.d", SECRET, MAINTENANT)).toBeNull();
  });
});

describe("connexion", () => {
  const [particulier, pro] = [
    getComptesDemo().find((c) => c.type === "particulier"),
    getComptesDemo().find((c) => c.type === "pro"),
  ];

  test("le bon e-mail et le bon mot de passe ouvrent le compte", () => {
    expect(verifierIdentifiants(particulier.email, particulier.motDePasse)?.type).toBe("particulier");
    expect(verifierIdentifiants(pro.email, pro.motDePasse)?.type).toBe("pro");
  });

  test("l'e-mail est accepté avec des majuscules ou des espaces autour", () => {
    expect(verifierIdentifiants(`  ${particulier.email.toUpperCase()} `, particulier.motDePasse)).not.toBeNull();
  });

  test("un mauvais mot de passe ou un e-mail inconnu est refusé", () => {
    expect(verifierIdentifiants(particulier.email, "mauvais")).toBeNull();
    expect(verifierIdentifiants(particulier.email, "")).toBeNull();
    expect(verifierIdentifiants("inconnu@exemple.pf", particulier.motDePasse)).toBeNull();
  });

  test("le compte renvoyé ne contient jamais le mot de passe", () => {
    const compte = verifierIdentifiants(particulier.email, particulier.motDePasse);
    expect(JSON.stringify(compte)).not.toContain(particulier.motDePasse);
    expect(JSON.stringify(getAccount(compte.id))).not.toContain(particulier.motDePasse);
  });

  test("un identifiant inconnu ne donne aucun compte", () => {
    expect(getAccount("inconnu")).toBeNull();
    expect(getAccount(null)).toBeNull();
  });
});

describe("espace d'un particulier", () => {
  const compte = getAccount("teva");
  const annonces = getAccountListings(compte);

  test("il voit ses annonces avec leur statut", () => {
    expect(annonces.length).toBeGreaterThan(0);
    for (const annonce of annonces) {
      expect(["active", "en_attente_validation", "refusee"]).toContain(annonce.statut);
    }
  });

  test("seules les annonces actives ont une page publique, et elle est à son nom", () => {
    for (const annonce of annonces) {
      if (annonce.statut !== "active") {
        expect(annonce.lien, annonce.titre).toBeUndefined();
        continue;
      }
      expect(annonce.lien, annonce.titre).toBe(`/annonces/${annonce.id}`);
      expect(getListing(annonce.id).vendeur, annonce.titre).toBe(compte.nom);
    }
  });

  test("le résumé compte les annonces actives, les vues et les contacts", () => {
    const resume = resumer(annonces);
    expect(resume.total).toBe(annonces.length);
    expect(resume.actives).toBe(annonces.filter((a) => a.statut === "active").length);
    expect(resume.vues).toBe(annonces.reduce((s, a) => s + a.vues, 0));
    expect(resume.contacts).toBe(annonces.reduce((s, a) => s + a.contacts, 0));
  });

  test("un particulier n'a pas de vitrine", () => {
    expect(getVitrine(compte)).toBeNull();
  });
});

describe("espace d'un pro", () => {
  const compte = getAccount("moana-auto");
  const annonces = getAccountListings(compte);

  test("il voit les annonces de sa vitrine, 20 au plus", () => {
    expect(annonces.length).toBeGreaterThan(0);
    expect(annonces.length).toBeLessThanOrEqual(MAX_ANNONCES_PRO);
    for (const annonce of annonces) {
      expect(getListing(annonce.id).shopId, annonce.titre).toBe(compte.shopId);
    }
  });

  test("aucune de ses annonces n'est boostée : le boost est réservé aux particuliers", () => {
    expect(annonces.every((a) => a.boost === "aucun")).toBe(true);
  });

  test("sa vitrine indique le nombre d'annonces et le maximum", () => {
    const vitrine = getVitrine(compte);
    expect(vitrine.pro.slug).toBe(compte.shopId);
    expect(vitrine.annonces).toBe(annonces.length);
    expect(vitrine.maximum).toBe(MAX_ANNONCES_PRO);
  });
});
