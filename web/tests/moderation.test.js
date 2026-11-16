/**
 * Tests de la validation des annonces par l'administrateur.
 *
 * Lancer : npm test (depuis le dossier web)
 *
 * Ils portent sur les règles de src/lib/moderation.ts, et sur la fonction `moderer_annonce` de la
 * migration « moderation » (relue sans base de données). La fonction elle-même a été essayée
 * dans la base : visiteur et non-administrateur refusés, refus sans motif refusé, limite de 5.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { attenteDepuis, lireDecision, messageErreurModeration, MOTIF_MAX, MOTIF_MIN, verifierMotifRefus } from "../src/lib/moderation";

const sql = readFileSync(join(import.meta.dirname, "..", "supabase", "migrations", "20261116000300_moderation.sql"), "utf8");

describe("décision de l'administrateur", () => {
  test("seules « active » et « refusee » sont acceptées", () => {
    expect(lireDecision("active")).toBe("active");
    expect(lireDecision("refusee")).toBe("refusee");
    for (const autre of ["en_attente_validation", "retiree", "", null, undefined, "ACTIVE"]) {
      expect(lireDecision(autre), String(autre)).toBeNull();
    }
  });

  test("un refus doit être motivé, sans dépasser la limite", () => {
    expect(verifierMotifRefus("")).toMatch(/caractères au moins/);
    expect(verifierMotifRefus("   abc   ")).toMatch(/caractères au moins/);
    expect(verifierMotifRefus("x".repeat(MOTIF_MIN))).toBeNull();
    expect(verifierMotifRefus("Photos manquantes")).toBeNull();
    expect(verifierMotifRefus("x".repeat(MOTIF_MAX))).toBeNull();
    expect(verifierMotifRefus("x".repeat(MOTIF_MAX + 1))).toMatch(/Raccourcissez/);
  });

  test("chaque erreur de la base donne un message compréhensible", () => {
    expect(messageErreurModeration("42501")).toMatch(/administrateur/);
    expect(messageErreurModeration("P0002")).toMatch(/déjà été traitée/);
    expect(messageErreurModeration("23514")).toMatch(/maximum d'annonces actives/);
    expect(messageErreurModeration(undefined)).toMatch(/Réessayez/);
  });

  test("le temps d'attente se lit simplement", () => {
    const maintenant = Date.parse("2026-11-16T12:00:00Z");
    expect(attenteDepuis("2026-11-16T12:00:00Z", maintenant)).toBe("à l'instant");
    expect(attenteDepuis("2026-11-16T11:45:00Z", maintenant)).toBe("il y a 15 min");
    expect(attenteDepuis("2026-11-16T09:00:00Z", maintenant)).toBe("il y a 3 h");
    expect(attenteDepuis("2026-11-15T10:00:00Z", maintenant)).toBe("il y a 1 jour");
    expect(attenteDepuis("2026-11-12T10:00:00Z", maintenant)).toBe("il y a 4 jours");
  });
});

describe("fonction moderer_annonce de la base", () => {
  test("elle vérifie le rôle d'administrateur avant tout", () => {
    expect(sql).toMatch(/if not private\.is_admin\(\) then\s+raise exception/);
  });

  test("les mêmes limites de motif que le site", () => {
    expect(sql).toContain(`char_length(motif_net) < ${MOTIF_MIN}`);
    expect(sql).toContain(`> ${MOTIF_MAX} then`);
  });

  test("elle ne traite qu'une annonce encore en attente", () => {
    expect(sql).toContain("and statut = 'en_attente_validation'");
  });

  test("un visiteur sans compte ne peut pas l'appeler", () => {
    expect(sql).toContain("revoke execute on function public.moderer_annonce(bigint, text, text) from public, anon;");
  });
});
