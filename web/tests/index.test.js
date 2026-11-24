/**
 * Tests des index de l'accueil et de la recherche (migration index_recherche).
 * Le comportement réel a été mesuré à part sur 20 000 annonces : recherche en 1 à 9 ms.
 *
 * Lancer : npm test (depuis le dossier web)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const dossier = join(import.meta.dirname, "..", "supabase", "migrations");
const migration = readdirSync(dossier)
  .filter((nom) => nom.includes("index_recherche"))
  .map((nom) => readFileSync(join(dossier, nom), "utf8"))
  .join("\n");
const recherche = migration.slice(migration.indexOf("create or replace function public.rechercher_annonces("));

describe("index de l'accueil et de la recherche", () => {
  test("l'accueil a son index : annonces de particuliers en ligne, les plus récentes d'abord", () => {
    expect(migration).toContain("create index listings_accueil_idx on public.listings (created_at desc)");
    expect(migration).toContain("where statut = 'active' and shop_id is null;");
  });

  test("la recherche a un index trigrammes sur le texte sans accents", () => {
    expect(migration).toContain("create extension if not exists pg_trgm with schema extensions");
    expect(migration).toContain("language sql immutable parallel safe strict set search_path = ''");
    expect(migration).toContain("using gin (private.sans_accents(titre || ' ' || commune || ' ' || ile) extensions.gin_trgm_ops)");
  });

  test("la fonction cherche avec la même expression que l'index, sinon l'index ne sert pas", () => {
    expect(recherche).toContain("private.sans_accents(a.titre || ' ' || a.commune || ' ' || a.ile) like motif.texte");
  });

  test("texte et catégorie cherchés séparément puis réunis (un « ou » relisait toutes les annonces)", () => {
    expect(recherche).toContain("union");
    expect(recherche).toContain("private.sans_accents(c.nom) like motif.texte");
  });

  test("% et _ tapés par le visiteur restent cherchés tels quels", () => {
    expect(recherche).toContain(String.raw`replace(replace(replace(private.sans_accents(trim(recherche)), '\', '\\'), '%', '\%'), '_', '\_')`);
  });

  test("toujours : annonces de particuliers en ligne, non expirées, 100 au plus", () => {
    expect(recherche).toContain("a.statut = 'active' and a.shop_id is null");
    expect(recherche).toContain("(l.expire_le is null or l.expire_le > now())");
    expect(recherche).toContain("limit 100");
  });
});
