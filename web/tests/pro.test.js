/**
 * Tests de l'espace pro (SPEC.md, section 4 sexies) : profil de la vitrine, étapes avant la
 * mise en ligne, gestes de l'administrateur, et règles de la base.
 *
 * Lancer : npm test (depuis le dossier web)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  CONFIRMATION_VITRINE,
  etapesVitrine,
  gestesVitrine,
  HORAIRES_LIGNES_MAX,
  LIBELLE_GESTE_VITRINE,
  lignesHoraires,
  lireGesteVitrine,
  PRESENTATION_MAX,
  validerVitrine,
  vitrineEnLigne,
} from "../src/lib/vitrine";

const dossier = join(import.meta.dirname, "..", "supabase", "migrations");
const migrations = readdirSync(dossier).sort().map((nom) => readFileSync(join(dossier, nom), "utf8")).join("\n");
/** Dernière version d'une fonction SQL (une migration peut la remplacer). */
const fonctionSql = (nom) => {
  const debut = Math.max(migrations.lastIndexOf(`create function public.${nom}(`), migrations.lastIndexOf(`create or replace function public.${nom}(`));
  return migrations.slice(debut, migrations.indexOf("$$;", debut));
};
/** Dernière version d'une règle d'accès. */
const regle = (nom) => {
  const debut = migrations.lastIndexOf(`create policy "${nom}"`);
  return migrations.slice(debut, migrations.indexOf(";", debut));
};

const saisie = { secteur: "services", ile: "Tahiti", commune: " Faa'a ", presentation: "Plomberie depuis 1998.", horaires: "Lun-ven 7h-16h\n\n  Sam 8h-12h " };

describe("profil de la vitrine", () => {
  test("un profil complet est accepté, nettoyé", () => {
    const resultat = validerVitrine(saisie);
    expect(resultat).toEqual({
      ok: true,
      vitrine: { secteur: "services", ile: "Tahiti", commune: "Faa'a", presentation: "Plomberie depuis 1998.", horaires: ["Lun-ven 7h-16h", "Sam 8h-12h"] },
    });
  });

  test("présentation et horaires sont facultatifs", () => {
    expect(validerVitrine({ ...saisie, presentation: "", horaires: "" }).ok).toBe(true);
  });

  test("secteur, île et commune sont obligatoires", () => {
    const resultat = validerVitrine({ ...saisie, secteur: "inconnu", ile: "Atlantide", commune: "  " });
    expect(resultat.ok).toBe(false);
    expect(Object.keys(resultat.erreurs).sort()).toEqual(["commune", "ile", "secteur"]);
  });

  test("pas d'adresse e-mail dans la présentation, 1 000 caractères au plus", () => {
    expect(validerVitrine({ ...saisie, presentation: "Écrivez à contact@exemple.pf" }).erreurs.presentation).toMatch(/e-mail/);
    expect(validerVitrine({ ...saisie, presentation: "a".repeat(PRESENTATION_MAX + 1) }).erreurs.presentation).toBeTruthy();
  });

  test("7 lignes d'horaires de 60 caractères au plus", () => {
    expect(lignesHoraires("a\n\n b \r\nc")).toEqual(["a", "b", "c"]);
    const trop = Array.from({ length: HORAIRES_LIGNES_MAX + 1 }, (_, i) => `Jour ${i}`).join("\n");
    expect(validerVitrine({ ...saisie, horaires: trop }).erreurs.horaires).toBeTruthy();
    expect(validerVitrine({ ...saisie, horaires: "x".repeat(61) }).erreurs.horaires).toBeTruthy();
  });
});

describe("mise en ligne d'une vitrine", () => {
  test("en ligne seulement si active et vérifiée", () => {
    expect(vitrineEnLigne({ statut: "actif", verifie: true })).toBe(true);
    expect(vitrineEnLigne({ statut: "actif", verifie: false })).toBe(false);
    expect(vitrineEnLigne({ statut: "en_attente_paiement", verifie: true })).toBe(false);
    expect(vitrineEnLigne({ statut: "suspendu", verifie: true })).toBe(false);
  });

  test("le pro voit ce qui manque : documents de la DICP, puis paiement", () => {
    const etapes = etapesVitrine({ statut: "en_attente_paiement", verifie: false });
    expect(etapes).toHaveLength(2);
    expect(etapes[0]).toMatch(/DICP/);
    expect(etapes[1]).toMatch(/abonnement/);
    expect(etapesVitrine({ statut: "actif", verifie: true })).toEqual([]);
    expect(etapesVitrine({ statut: "suspendu", verifie: true })[0]).toMatch(/suspendue/);
  });
});

describe("gestes de l'administrateur sur une vitrine", () => {
  test("les boutons dépendent de l'état", () => {
    expect(gestesVitrine({ statut: "en_attente_paiement", verifie: false })).toEqual(["verifier", "activer", "suspendre"]);
    expect(gestesVitrine({ statut: "actif", verifie: true })).toEqual(["retirer_badge", "suspendre"]);
    expect(gestesVitrine({ statut: "suspendu", verifie: true })).toEqual(["retirer_badge", "activer"]);
  });

  test("chaque geste a un libellé et une confirmation, les autres valeurs sont refusées", () => {
    for (const geste of ["verifier", "retirer_badge", "activer", "suspendre"]) {
      expect(lireGesteVitrine(geste)).toBe(geste);
      expect(LIBELLE_GESTE_VITRINE[geste]).toBeTruthy();
      expect(CONFIRMATION_VITRINE[geste]).toBeTruthy();
    }
    for (const piege of ["supprimer", "", null, undefined, 1]) expect(lireGesteVitrine(piege), String(piege)).toBeNull();
  });
});

describe("règles de la base pour l'espace pro", () => {
  test("une annonce de vitrine n'est publique que si la vitrine est active et vérifiée", () => {
    expect(regle("annonces : lecture publique")).toContain("s.statut = 'actif' and s.verifie");
  });

  test("un pro ne dépose pas parmi les annonces de particuliers", () => {
    const depot = regle("annonces : dépôt");
    expect(depot).toContain("shop_id is null and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'particulier')");
    expect(depot).toContain("s.user_id = (select auth.uid())");
  });

  test("un pro peut ajouter des photos aux annonces de sa vitrine", () => {
    expect(fonctionSql("ajouter_photo")).not.toContain("shop_id is null");
  });

  test("le pro ne modifie sa vitrine que par la fonction, jamais son nom, son statut ni son badge", () => {
    expect(migrations).toContain("revoke update (nom, secteur, category_id, ile, commune, presentation, horaires) on public.shops from authenticated;");
    const sql = fonctionSql("modifier_vitrine");
    expect(sql).toContain("where user_id = (select auth.uid())");
    expect(sql).not.toMatch(/\bnom =|statut =|verifie =/);
  });

  test("seul l'administrateur voit les vitrines et décide", () => {
    expect(fonctionSql("vitrines_admin")).toContain("if not private.is_admin()");
    expect(fonctionSql("decider_vitrine")).toContain("if not private.is_admin()");
    expect(migrations).toContain("revoke execute on function public.vitrines_admin() from public, anon;");
  });
});
