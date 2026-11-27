/**
 * Tests des protections contre les abus (SPEC.md, section 4 octies) : piège à robots, et règles
 * de la base (migration limites_comptes). Le comportement de la base a aussi été vérifié sur la
 * démo, dans une transaction annulée.
 *
 * Lancer : npm test (depuis le dossier web)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { CHAMP_DEBUT, CHAMP_PIEGE, estRobot, formulaireDeRobot, MESSAGES_LIMITE } from "../src/lib/essais";

const maintenant = Date.parse("2026-11-26T10:00:00Z");
const il_y_a = (ms) => String(maintenant - ms);

describe("piège à robots", () => {
  test("un humain passe : champ vide, plus de 3 secondes", () => {
    expect(estRobot("", il_y_a(3000), maintenant)).toBe(false);
    expect(estRobot("", il_y_a(60 * 60 * 1000), maintenant)).toBe(false);
    expect(estRobot(null, il_y_a(10_000), maintenant)).toBe(false);
  });

  test("champ caché rempli : robot", () => {
    expect(estRobot("https://pub.example", il_y_a(10_000), maintenant)).toBe(true);
  });

  test("envoyé trop vite, sans heure ou heure fausse : robot", () => {
    expect(estRobot("", il_y_a(2999), maintenant)).toBe(true);
    expect(estRobot("", "", maintenant)).toBe(true);
    expect(estRobot("", null, maintenant)).toBe(true);
    expect(estRobot("", "abc", maintenant)).toBe(true);
    expect(estRobot("", String(maintenant + 5 * 60_000), maintenant)).toBe(true);
  });

  test("lu dans un formulaire reçu", () => {
    const formulaire = new FormData();
    formulaire.set(CHAMP_PIEGE, "");
    formulaire.set(CHAMP_DEBUT, il_y_a(5000));
    expect(formulaireDeRobot(formulaire, maintenant)).toBe(false);
    formulaire.set(CHAMP_PIEGE, "x");
    expect(formulaireDeRobot(formulaire, maintenant)).toBe(true);
  });

  test("le piège est dans l'inscription, le mot de passe oublié et le dépôt", () => {
    for (const nom of ["SignupForm", "ForgotPasswordForm", "PublishForm"]) {
      const source = readFileSync(join(import.meta.dirname, "..", "src", "components", `${nom}.tsx`), "utf8");
      expect(source, nom).toContain("<PiegeRobots />");
    }
    const actions = readFileSync(join(import.meta.dirname, "..", "src", "app", "actions.ts"), "utf8");
    expect(actions.match(/formulaireDeRobot\(formulaire\)/g)).toHaveLength(3);
  });

  test("chaque limite a son message", () => {
    expect(MESSAGES_LIMITE.connexion).toMatch(/15 minutes/);
    expect(MESSAGES_LIMITE.inscription).toMatch(/une heure/);
    expect(MESSAGES_LIMITE.mot_de_passe).toMatch(/une heure/);
  });
});

describe("limites d'essais : règles de la base", () => {
  const dossier = join(import.meta.dirname, "..", "supabase", "migrations");
  const migration = readdirSync(dossier)
    .filter((nom) => nom.includes("limites_comptes"))
    .map((nom) => readFileSync(join(dossier, nom), "utf8"))
    .join("\n");

  test("seul le serveur (clé secrète) compte les essais", () => {
    expect(migration).toContain("revoke execute on function public.controler_essai(text, text, text, boolean) from public, anon, authenticated;");
    expect(migration).toContain("grant execute on function public.controler_essai(text, text, text, boolean) to service_role;");
    expect(migration).toContain("revoke execute on function public.oublier_essais(text, text) from public, anon, authenticated;");
    expect(migration).toContain("using (false) with check (false)");
  });

  test("valeurs de SPEC.md 4 octies", () => {
    expect(migration).toContain("when 'connexion' then fenetre := interval '15 minutes'; max_cle := 10; max_adresse := 50;");
    expect(migration).toContain("when 'inscription' then fenetre := interval '1 hour'; max_cle := 3; max_adresse := 20;");
    expect(migration).toContain("when 'mot_de_passe' then fenetre := interval '1 hour'; max_cle := 3; max_adresse := 20;");
  });

  test("empreintes seulement, effacées au bout d'une heure", () => {
    expect(migration).toContain("check (length(cle) between 16 and 64)");
    expect(migration).toContain("delete from public.essais where created_at < now() - interval '1 hour';");
  });
});
