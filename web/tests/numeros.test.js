/**
 * Tests de la limite de « Voir le numéro » (SPEC.md, section 4, point 7) : cookie signé du
 * visiteur, adresse IP, empreintes, et règles de la base.
 *
 * Lancer : npm test (depuis le dossier web)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  adresseClient,
  creerCookieVisiteur,
  empreinte,
  lireCookieVisiteur,
  optionsCookieVisiteur,
  pageAvecNumero,
} from "../src/lib/visiteur";

const SECRET = "secret-de-test";
const entetes = (valeurs) => ({ get: (nom) => valeurs[nom] ?? null });

describe("visiteur : cookie signé", () => {
  test("un cookie créé par le serveur est reconnu", async () => {
    const cookie = await creerCookieVisiteur(SECRET);
    expect(await lireCookieVisiteur(SECRET, cookie)).toBe(cookie.split(".")[0]);
  });

  test("un cookie inventé ou modifié est refusé", async () => {
    const cookie = await creerCookieVisiteur(SECRET);
    const [id, signature] = cookie.split(".");
    expect(await lireCookieVisiteur("autre-secret", cookie)).toBeNull();
    expect(await lireCookieVisiteur(SECRET, `${crypto.randomUUID()}.${signature}`)).toBeNull();
    for (const piege of [undefined, null, "", id, `${id}.`, `${id}.${signature}.x`, "x".repeat(200)]) {
      expect(await lireCookieVisiteur(SECRET, piege)).toBeNull();
    }
  });

  test("cookie illisible par le navigateur", () => {
    expect(optionsCookieVisiteur()).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });

  test("posé seulement sur les pages d'annonce et de vitrine", () => {
    expect(pageAvecNumero("/annonces/12")).toBe(true);
    expect(pageAvecNumero("/pros/garage-teva")).toBe(true);
    expect(pageAvecNumero("/")).toBe(false);
    expect(pageAvecNumero("/pros")).toBe(false);
    expect(pageAvecNumero("/compte/annonces/12/modifier")).toBe(false);
  });
});

describe("visiteur : adresse et empreintes", () => {
  test("première adresse de x-forwarded-for, sinon x-real-ip", () => {
    expect(adresseClient(entetes({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(adresseClient(entetes({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(adresseClient(entetes({}))).toBe("inconnue");
  });

  test("la base ne reçoit jamais l'adresse en clair", async () => {
    const a = await empreinte(SECRET, "adresse", "203.0.113.5");
    expect(a).toHaveLength(32);
    expect(a).not.toContain("203");
    expect(await empreinte(SECRET, "adresse", "203.0.113.5")).toBe(a);
    expect(await empreinte(SECRET, "visiteur", "203.0.113.5")).not.toBe(a);
  });
});

describe("« Voir le numéro » : règles de la base", () => {
  const dossier = join(import.meta.dirname, "..", "supabase", "migrations");
  const migration = readdirSync(dossier)
    .filter((nom) => nom.includes("limite_numeros"))
    .map((nom) => readFileSync(join(dossier, nom), "utf8"))
    .join("\n");

  test("20 par visiteur et 300 par adresse, sur une heure", () => {
    expect(migration).toContain(">= 20");
    expect(migration).toContain(">= 300");
    expect(migration).toContain("interval '1 hour'");
    expect(migration).toContain("hint = 'limite'");
  });

  test("la clé publique n'a plus accès aux numéros, seul le serveur", () => {
    expect(migration).toContain("revoke execute on function public.voir_numero_annonce(bigint, text, text) from public, anon, authenticated");
    expect(migration).toContain("revoke execute on function public.voir_numero_vitrine(text, text, text) from public, anon, authenticated");
    expect(migration).toContain("to service_role");
    expect(migration).not.toMatch(/grant execute on function public\.voir_numero_\w+\([^)]*\) to [^;]*anon/);
  });

  test("le client à clé secrète ne vit que côté serveur", () => {
    const numeros = readFileSync(join(import.meta.dirname, "..", "src", "lib", "numeros.ts"), "utf8");
    expect(numeros).toContain("process.env.SUPABASE_SECRET_KEY");
    expect(numeros).not.toContain("use client");
    expect(numeros).not.toContain("NEXT_PUBLIC_SUPABASE_SECRET");
  });
});
