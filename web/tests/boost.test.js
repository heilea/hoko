/**
 * Tests du boost (SPEC.md, section 1) : numéro de commande, lecture des valeurs reçues,
 * places libres, et règles de la base.
 *
 * Lancer : npm test (depuis le dossier web)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { versSuivi } from "../src/lib/accounts";
import {
  CONFIRMATION_BOOST,
  LIBELLE_GESTE_BOOST,
  lireGesteBoost,
  lireResultatCommande,
  MAX_BOOSTS_PARTICULIER,
  numeroCommande,
  PLACES_BOOST,
  placesLibres,
} from "../src/lib/boost";

const dossier = join(import.meta.dirname, "..", "supabase", "migrations");
const migrations = readdirSync(dossier).sort().map((nom) => readFileSync(join(dossier, nom), "utf8")).join("\n");
const fonctionSql = (nom) => {
  const debut = Math.max(migrations.lastIndexOf(`create function public.${nom}(`), migrations.lastIndexOf(`create or replace function public.${nom}(`));
  return migrations.slice(debut, migrations.indexOf("$$;", debut));
};

describe("boost : affichage", () => {
  test("numéro de commande à mettre en référence", () => {
    expect(numeroCommande(123)).toBe("B-000123");
    expect(numeroCommande("4567890")).toBe("B-4567890");
  });

  test("3 places par catégorie, 2 boosts par particulier", () => {
    expect(PLACES_BOOST).toBe(3);
    expect(MAX_BOOSTS_PARTICULIER).toBe(2);
    expect(placesLibres(1)).toBe(2);
    expect(placesLibres(5)).toBe(0);
  });

  test("seules les valeurs connues sont lues", () => {
    for (const r of ["commande", "complet", "max_compte"]) expect(lireResultatCommande(r)).toBe(r);
    for (const g of ["activer", "annuler"]) {
      expect(lireGesteBoost(g)).toBe(g);
      expect(LIBELLE_GESTE_BOOST[g]).toBeTruthy();
      expect(CONFIRMATION_BOOST[g]).toBeTruthy();
    }
    for (const piege of ["supprimer", "", null, undefined, 1]) {
      expect(lireResultatCommande(piege)).toBeNull();
      expect(lireGesteBoost(piege)).toBeNull();
    }
  });

  test("une commande non payée s'affiche « en attente de paiement » dans l'espace", () => {
    const ligne = { id: 1, titre: "Vélo", prix_xpf: 1000, statut: "active", boost_jusqu_au: null, motif_refus: null, expire_le: null, categories: { slug: "sports" } };
    expect(versSuivi({ ...ligne, boosts: [{ statut: "en_attente_paiement" }] }, Date.now()).boost).toBe("en_attente_paiement");
    expect(versSuivi({ ...ligne, boosts: [{ statut: "annule" }] }, Date.now()).boost).toBe("aucun");
    expect(versSuivi({ ...ligne, boost_jusqu_au: new Date(Date.now() + 86400000).toISOString() }, Date.now()).boost).toBe("actif");
  });
});

describe("boost : règles de la base", () => {
  const commande = fonctionSql("commander_boost");

  test("réservé aux particuliers, annonce en ligne, pas de double boost", () => {
    expect(commande).toContain("p.role <> 'pro'");
    expect(commande).toContain("a.shop_id is not null");
    expect(commande).toContain("a.statut <> 'active'");
    expect(commande).toContain("hint = 'deja'");
  });

  test("3 places par catégorie et 2 boosts par compte, sans dépasser à deux en même temps", () => {
    expect(commande).toContain(">= 3");
    expect(commande).toContain(">= 2");
    expect(commande).toContain("pg_advisory_xact_lock");
  });

  test("« Complet » est compté sans erreur, pour garder la trace", () => {
    expect(commande).toContain("insert into public.boost_complets");
    expect(commande).toContain("'complet'::text");
  });

  test("le prix vient de la table des tarifs par catégorie, recopié sur la commande", () => {
    expect(commande).toContain("public.boost_tarifs");
    expect(commande).toContain("insert into public.boosts (listing_id, montant_xpf) values (a.id, prix)");
  });

  test("seul l'administrateur active, 7 jours à partir de l'activation", () => {
    const decider = fonctionSql("decider_boost");
    expect(decider).toContain("if not private.is_admin()");
    expect(decider).toContain("now() + interval '7 days'");
    expect(fonctionSql("boosts_admin")).toContain("if not private.is_admin()");
  });
});
