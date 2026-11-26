/**
 * Tests de « Signaler une annonce » (SPEC.md, section 4 septies) : règles pures, regroupement
 * pour l'administrateur, et règles de la base (migration signalements).
 * Le comportement de la base a aussi été vérifié sur la démo, dans une transaction annulée.
 *
 * Lancer : npm test (depuis le dossier web)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  lireGesteSignalement,
  lireMotif,
  messageErreurTraitement,
  messageRefusSignalement,
  regrouperSignalements,
  verifierSignalement,
} from "../src/lib/signalements";

describe("signalement : saisie du visiteur", () => {
  test("un motif connu est obligatoire", () => {
    expect(verifierSignalement("", "")).toBe("Choisissez un motif.");
    expect(verifierSignalement("nimporte", "")).toBe("Choisissez un motif.");
    expect(verifierSignalement("arnaque", "")).toBeNull();
    expect(lireMotif("doublon")).toBe("doublon");
    expect(lireMotif("DOUBLON")).toBeNull();
  });

  test("« autre » demande 10 caractères de précision", () => {
    expect(verifierSignalement("autre", "court")).toMatch(/10 caractères/);
    expect(verifierSignalement("autre", "   court    ")).toMatch(/10 caractères/);
    expect(verifierSignalement("autre", "Photo volée sur internet")).toBeNull();
  });

  test("précision limitée à 500 caractères", () => {
    expect(verifierSignalement("interdit", "a".repeat(500))).toBeNull();
    expect(verifierSignalement("interdit", "a".repeat(501))).toMatch(/500/);
  });

  test("chaque refus de la base a un message clair", () => {
    expect(messageRefusSignalement("deja")).toMatch(/déjà signalé/);
    expect(messageRefusSignalement("limite")).toMatch(/une heure/);
    expect(messageRefusSignalement("introuvable")).toMatch(/plus en ligne/);
    expect(messageRefusSignalement(undefined)).toMatch(/Réessayez/);
  });
});

describe("signalement : traitement par l'administrateur", () => {
  test("deux gestes seulement", () => {
    expect(lireGesteSignalement("retirer")).toBe("retirer");
    expect(lireGesteSignalement("classer")).toBe("classer");
    expect(lireGesteSignalement("supprimer")).toBeNull();
  });

  test("messages d'erreur", () => {
    expect(messageErreurTraitement("42501", undefined)).toMatch(/administrateur/);
    expect(messageErreurTraitement(undefined, "plus_en_ligne")).toMatch(/classez/);
    expect(messageErreurTraitement(undefined, "motif")).toMatch(/5 à 500/);
  });

  test("regroupés par annonce, les plus signalées d'abord, motifs comptés", () => {
    const annonce = (titre, statut = "active", expire_le = null) => ({ titre, vendeur_nom: "Teva", statut, expire_le });
    const groupes = regrouperSignalements(
      [
        { listing_id: 1, motif: "arnaque", details: null, created_at: "2026-11-26T10:00:00Z", listings: annonce("Vélo") },
        { listing_id: 2, motif: "doublon", details: "Même annonce deux fois", created_at: "2026-11-26T09:00:00Z", listings: annonce("Pirogue") },
        { listing_id: 2, motif: "arnaque", details: null, created_at: "2026-11-26T11:00:00Z", listings: annonce("Pirogue") },
        { listing_id: 2, motif: "doublon", details: null, created_at: "2026-11-26T08:00:00Z", listings: annonce("Pirogue") },
        { listing_id: 3, motif: "autre", details: "Photo volée", created_at: "2026-11-26T12:00:00Z", listings: annonce("Kayak", "active", "2026-11-01T00:00:00Z") },
      ],
      Date.parse("2026-11-26T13:00:00Z"),
    );
    expect(groupes.map((g) => g.annonceId)).toEqual([2, 3, 1]);
    expect(groupes[0].nombre).toBe(3);
    expect(groupes[0].parMotif).toEqual([
      { motif: "doublon", nombre: 2 },
      { motif: "arnaque", nombre: 1 },
    ]);
    expect(groupes[0].details).toEqual(["Même annonce deux fois"]);
    expect(groupes[0].dernier).toBe("2026-11-26T11:00:00Z");
    expect(groupes[0].enLigne).toBe(true);
    // Annonce expirée : plus en ligne, on ne peut que classer
    expect(groupes[1].enLigne).toBe(false);
  });
});

describe("signalement : règles de la base", () => {
  const dossier = join(import.meta.dirname, "..", "supabase", "migrations");
  const migration = readdirSync(dossier)
    .filter((nom) => nom.includes("signalements"))
    .map((nom) => readFileSync(join(dossier, nom), "utf8"))
    .join("\n");

  test("seul le serveur (clé secrète) enregistre un signalement", () => {
    expect(migration).toContain("revoke execute on function public.signaler_annonce(bigint, text, text, text, text) from public, anon, authenticated;");
    expect(migration).toContain("grant execute on function public.signaler_annonce(bigint, text, text, text, text) to service_role;");
    expect(migration).toContain("revoke insert, update, delete on public.signalements from anon, authenticated;");
  });

  test("seul l'administrateur lit et traite", () => {
    expect(migration).toContain("for select to authenticated using (private.is_admin());");
    expect(migration).toMatch(/function public\.traiter_signalements[\s\S]*if not private\.is_admin\(\)/);
  });

  test("une fois par annonce et par visiteur, 5 par heure, 50 par adresse", () => {
    expect(migration).toContain("unique (listing_id, visiteur)");
    expect(migration).toMatch(/interval '1 hour'\) >= 5/);
    expect(migration).toMatch(/interval '1 hour'\) >= 50/);
  });

  test("annonce en ligne seulement, retrait avec motif lu par l'annonceur", () => {
    expect(migration).toContain("and l.statut = 'active'");
    expect(migration).toContain("set statut = 'refusee', motif_refus = motif_net");
  });
});
