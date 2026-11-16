/**
 * Tests du schéma Supabase (supabase/migrations).
 *
 * Lancer : npm test (depuis le dossier web)
 *
 * Ils relisent le fichier SQL sans base de données : ils vérifient qu'il reste accordé au code
 * (catégories, limites d'annonces) et qu'aucune table n'est laissée sans règles d'accès.
 * Ils ne remplacent pas `npm run supabase:verifier`, qui interroge le vrai projet.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { categories, MAX_ANNONCES_PARTICULIER, MAX_ANNONCES_PRO } from "../src/lib/data";

const dossier = join(import.meta.dirname, "..", "supabase", "migrations");
const sql = readdirSync(dossier)
  .filter((nom) => nom.endsWith(".sql"))
  .sort()
  .map((nom) => readFileSync(join(dossier, nom), "utf8"))
  .join("\n");

const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);

describe("schéma Supabase", () => {
  test("les types générés (database.types.ts) connaissent chaque table des migrations", () => {
    // Sinon : régénérer les types après la dernière migration (voir l'en-tête du fichier)
    const types = readFileSync(join(import.meta.dirname, "..", "src", "lib", "database.types.ts"), "utf8");
    for (const table of tables) {
      expect(types, table).toMatch(new RegExp(`^ {6}${table}: \{$`, "m"));
    }
  });

  test("les tables du modèle de données sont créées", () => {
    for (const table of ["profiles", "categories", "shops", "shop_private", "listings", "photos", "boosts", "contact_reveals", "ad_slots", "customer_accounts_b2b", "purchase_orders"]) {
      expect(tables, table).toContain(table);
    }
  });

  test("chaque table a la sécurité par ligne activée", () => {
    for (const table of tables) {
      expect(sql, table).toContain(`alter table public.${table} enable row level security`);
    }
  });

  test("chaque table a au moins une règle d'accès", () => {
    for (const table of tables) {
      expect(sql, table).toMatch(new RegExp(`create policy "[^"]+" on public\\.${table}\\b`));
    }
  });

  test("les catégories du schéma sont celles du site, dans le même ordre", () => {
    const bloc = sql.slice(sql.indexOf("insert into public.categories"));
    const slugs = [...bloc.slice(0, bloc.indexOf(";")).matchAll(/\('([a-z0-9-]+)',/g)].map((m) => m[1]);
    expect(slugs).toEqual(categories.map((c) => c.slug));
  });

  test("les limites d'annonces actives sont celles du site : 5 par particulier, 20 par vitrine", () => {
    expect(sql).toContain(`if actives >= ${MAX_ANNONCES_PARTICULIER} then`);
    expect(sql).toContain(`if actives >= ${MAX_ANNONCES_PRO} then`);
  });

  test("le téléphone et le numéro TAHITI ne sont dans aucune table lisible par le public", () => {
    for (const table of ["shops", "listings", "categories", "photos", "ad_slots"]) {
      const debut = sql.indexOf(`create table public.${table} (`);
      const definition = sql.slice(debut, sql.indexOf("\n);", debut));
      expect(definition, table).not.toMatch(/telephone|numero_tahiti|email/);
    }
  });

  test("un annonceur ne peut modifier ni le statut ni le boost de son annonce, ni son propre rôle", () => {
    const droits = (table) => sql.match(new RegExp(`grant update \\(([^)]+)\\) on public\\.${table} to authenticated`))?.[1] ?? "";
    expect(droits("listings")).not.toMatch(/statut|boost|user_id|shop_id|vendeur_nom/);
    expect(droits("shops")).not.toMatch(/statut|verifie|user_id|slug/);
    expect(droits("profiles")).not.toMatch(/role|id/);
    for (const table of ["listings", "shops", "profiles"]) {
      expect(sql, table).toContain(`revoke update on public.${table} from authenticated, anon`);
    }
  });
});
