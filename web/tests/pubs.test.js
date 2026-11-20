/**
 * Tests des espaces pub (SPEC.md, section 3 ter) : règles d'affichage, saisie de
 * l'administrateur, et règles de la base.
 *
 * Lancer : npm test (depuis le dossier web)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  CONFIRMATION_PUB,
  etatPub,
  LIBELLE_GESTE_PUB,
  lienValide,
  lireGestePub,
  numeroPub,
  PUB_HAUTEUR,
  PUB_JOURS,
  PUB_LARGEUR,
  validerPub,
} from "../src/lib/pubs";

const dossier = join(import.meta.dirname, "..", "supabase", "migrations");
const migration = readdirSync(dossier)
  .filter((nom) => nom.includes("espaces_pub"))
  .map((nom) => readFileSync(join(dossier, nom), "utf8"))
  .join("\n");
const source = (chemin) => readFileSync(join(import.meta.dirname, "..", "src", ...chemin.split("/")), "utf8");

describe("espaces pub : règles", () => {
  test("30 jours, bandeau 4:1, numéro de commande P-", () => {
    expect(PUB_JOURS).toBe(30);
    expect(PUB_LARGEUR / PUB_HAUTEUR).toBe(4);
    expect(numeroPub(42)).toBe("P-000042");
  });

  test("seuls les gestes connus sont lus", () => {
    for (const g of ["activer", "annuler", "retirer"]) {
      expect(lireGestePub(g)).toBe(g);
      expect(LIBELLE_GESTE_PUB[g]).toBeTruthy();
      expect(CONFIRMATION_PUB[g]).toBeTruthy();
    }
    for (const piege of ["supprimer", "", null, undefined, 1]) expect(lireGestePub(piege)).toBeNull();
  });

  test("le lien doit être une adresse https complète", () => {
    expect(lienValide("https://vini.pf")).toBe(true);
    expect(lienValide("https://www.facebook.com/garage.teva")).toBe(true);
    for (const piege of ["http://vini.pf", "javascript:alert(1)", "vini.pf", "https://", "https://a b.pf", `https://${"a".repeat(500)}.pf`]) {
      expect(lienValide(piege)).toBe(false);
    }
  });

  test("saisie de l'administrateur : emplacement, catégorie, nom, lien", () => {
    const bonne = { emplacement: "categorie", categorie: "vehicules", annonceur: "Moana Auto", lien: "https://moana.pf" };
    expect(validerPub(bonne)).toEqual({});
    expect(validerPub({ ...bonne, emplacement: "accueil", categorie: "" })).toEqual({});
    expect(Object.keys(validerPub({ ...bonne, categorie: "inconnue" }))).toEqual(["categorie"]);
    expect(Object.keys(validerPub({ ...bonne, emplacement: "barre" }))).toEqual(["emplacement"]);
    expect(Object.keys(validerPub({ ...bonne, annonceur: " a " }))).toEqual(["annonceur"]);
    expect(Object.keys(validerPub({ ...bonne, lien: "http://moana.pf" }))).toEqual(["lien"]);
  });

  test("une pub dont la fin est passée est terminée d'elle-même", () => {
    const maintenant = Date.now();
    const demain = new Date(maintenant + 86400000).toISOString();
    const hier = new Date(maintenant - 86400000).toISOString();
    expect(etatPub("actif", demain, maintenant)).toBe("en_place");
    expect(etatPub("actif", hier, maintenant)).toBe("terminee");
    expect(etatPub("en_attente_paiement", null, maintenant)).toBe("en_attente");
    expect(etatPub("annule", null, maintenant)).toBe("annulee");
    expect(etatPub("termine", hier, maintenant)).toBe("terminee");
  });

  test("le lien de la pub est marqué « sponsorisé » et la mention « Publicité » est visible", () => {
    const composant = source("components/EspacePub.tsx");
    expect(composant).toContain('rel="sponsored noopener noreferrer"');
    expect(composant).toContain(">Publicité</span>");
  });

  test("retirer une pub payée exige la case cochée, vérifiée aussi par le serveur", () => {
    expect(source("app/pub-actions.ts")).toContain('geste === "retirer" && formulaire.get("confirmation") !== "oui"');
    expect(source("app/admin/pubs/page.tsx")).toContain('name="confirmation" value="oui" required');
  });

  test("une commande dont la place est occupée n'a pas de bouton « activer »", () => {
    const page = source("app/admin/pubs/page.tsx");
    expect(page).toContain("{!occupant && (");
    expect(page).toContain("N&apos;encaissez pas ce paiement");
  });

  test("les erreurs passent par un code dans l'adresse, jamais par un texte", () => {
    const actions = source("app/pub-actions.ts");
    expect(actions).not.toContain("encodeURIComponent");
  });
});

describe("espaces pub : règles de la base", () => {
  test("exclusif seulement, 30 jours à partir de l'activation, une seule pub en place", () => {
    expect(migration).toContain("check (mode = 'exclusif')");
    expect(migration).toContain("fin = now() + interval '30 days'");
    expect(migration).toContain("hint = 'occupe'");
    expect(migration).toContain("pg_advisory_xact_lock");
  });

  test("seul l'administrateur crée et décide ; plus d'écriture directe dans la table", () => {
    expect(migration.match(/if not private\.is_admin\(\)/g)).toHaveLength(2);
    expect(migration).toContain("revoke insert, update, delete on public.ad_slots from anon, authenticated");
    expect(migration).not.toMatch(/create policy[^;]*on public\.ad_slots\s+for (all|insert|update|delete)/);
  });

  test("le public ne voit que les pubs en place", () => {
    expect(migration).toContain("using ((statut = 'actif' and fin > now()) or private.is_admin())");
  });

  test("lien https et visuel dans le dossier pubs seulement", () => {
    expect(migration).toContain("lien ~ '^https://[^[:space:]]+$'");
    expect(migration).toContain(String.raw`visuel ~ '^pubs/[0-9a-f-]{36}\.jpg$'`);
  });

  test("le prix vient de la table des tarifs, recopié sur la commande", () => {
    expect(migration).toContain("insert into public.pub_tarifs (emplacement, prix_xpf) values ('accueil', 100000), ('categorie', 45000)");
    expect(migration).toContain("select t.prix_xpf into prix from public.pub_tarifs");
  });
});
