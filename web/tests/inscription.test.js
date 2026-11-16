/**
 * Tests de l'inscription (page « Créer un compte »).
 *
 * Lancer : npm test (depuis le dossier web)
 *
 * Ils portent sur les règles de src/lib/inscription.ts (SPEC.md, section 4 quater).
 */
import { describe, expect, test } from "vitest";
import { lireEmail, MOT_DE_PASSE_MIN, NOM_MAX, NUMERO_TAHITI_MAX, validerInscription, validerMotDePasse } from "../src/lib/inscription";

/** Un particulier correct, à modifier champ par champ dans chaque test. */
const particulier = {
  type: "particulier",
  nom: "Hina",
  email: "hina@exemple.pf",
  telephone: "87 12 34 56",
  motDePasse: "pirogue-bleue",
  confirmation: "pirogue-bleue",
  numeroTahiti: "",
  secteur: "",
  ile: "",
  commune: "",
};

const pro = {
  ...particulier,
  type: "pro",
  nom: "Garage du Lagon",
  numeroTahiti: "a12345",
  secteur: "vehicules",
  ile: "Tahiti",
  commune: "Papeete",
};

const erreursDe = (saisie) => {
  const resultat = validerInscription(saisie);
  return resultat.ok ? {} : resultat.erreurs;
};

describe("inscription d'un particulier", () => {
  test("une saisie correcte est acceptée et nettoyée", () => {
    const resultat = validerInscription({ ...particulier, nom: "  Hina ", email: " Hina@Exemple.PF ", telephone: "87123456" });
    expect(resultat.ok).toBe(true);
    expect(resultat.compte).toEqual({ type: "particulier", nom: "Hina", email: "hina@exemple.pf", telephone: "87 12 34 56" });
  });

  test("le mot de passe ne figure jamais dans le résultat", () => {
    const resultat = validerInscription(particulier);
    expect(JSON.stringify(resultat)).not.toContain(particulier.motDePasse);
  });

  test("les champs de vitrine ne sont pas demandés, ni gardés", () => {
    const resultat = validerInscription({ ...particulier, numeroTahiti: "A12345", secteur: "vehicules" });
    expect(resultat.ok).toBe(true);
    expect(resultat.compte.vitrine).toBeUndefined();
  });

  test("chaque champ vide est signalé", () => {
    const erreurs = erreursDe({ ...particulier, nom: " ", email: "", telephone: "", motDePasse: "", confirmation: "" });
    expect(Object.keys(erreurs).sort()).toEqual(["confirmation", "email", "motDePasse", "nom", "telephone"]);
  });

  test("le type de compte doit être particulier ou pro", () => {
    expect(erreursDe({ ...particulier, type: "" }).type).toBeDefined();
    expect(erreursDe({ ...particulier, type: "admin" }).type).toBeDefined();
  });

  test("le prénom fait 2 caractères au moins et ne dépasse pas la limite", () => {
    expect(erreursDe({ ...particulier, nom: "H" }).nom).toBeDefined();
    expect(erreursDe({ ...particulier, nom: "x".repeat(NOM_MAX) }).nom).toBeUndefined();
    expect(erreursDe({ ...particulier, nom: "x".repeat(NOM_MAX + 1) }).nom).toBeDefined();
  });
});

describe("e-mail", () => {
  test("un e-mail mal formé est refusé", () => {
    for (const email of ["hina", "hina@", "@exemple.pf", "hina@exemple", "hina @exemple.pf", "a@b@c.pf"]) {
      expect(lireEmail(email), email).toBeNull();
      expect(erreursDe({ ...particulier, email }).email, email).toBeDefined();
    }
  });
});

describe("téléphone et mot de passe", () => {
  test("le téléphone doit compter 8 chiffres", () => {
    expect(erreursDe({ ...particulier, telephone: "87 12 34" }).telephone).toBeDefined();
    expect(erreursDe({ ...particulier, telephone: "+689 87 12 34 56" }).telephone).toBeUndefined();
  });

  test("le mot de passe a une longueur minimale", () => {
    const court = "x".repeat(MOT_DE_PASSE_MIN - 1);
    expect(erreursDe({ ...particulier, motDePasse: court, confirmation: court }).motDePasse).toBeDefined();
    const juste = "x".repeat(MOT_DE_PASSE_MIN);
    expect(erreursDe({ ...particulier, motDePasse: juste, confirmation: juste })).toEqual({});
  });

  test("le nouveau mot de passe (mot de passe oublié) suit les mêmes règles", () => {
    expect(validerMotDePasse("pirogue-bleue", "pirogue-bleue")).toEqual({});
    expect(validerMotDePasse("court", "court").motDePasse).toBeDefined();
    expect(validerMotDePasse("pirogue-bleue", "pirogue-rouge").confirmation).toBeDefined();
    expect(Object.keys(validerMotDePasse("", "")).sort()).toEqual(["confirmation", "motDePasse"]);
  });

  test("les deux mots de passe doivent être identiques", () => {
    expect(erreursDe({ ...particulier, confirmation: "pirogue-rouge" }).confirmation).toBeDefined();
    expect(erreursDe({ ...particulier, confirmation: "Pirogue-bleue" }).confirmation).toBeDefined();
  });
});

describe("inscription d'un pro", () => {
  test("une saisie correcte garde les informations de la vitrine", () => {
    const resultat = validerInscription(pro);
    expect(resultat.ok).toBe(true);
    expect(resultat.compte.type).toBe("pro");
    expect(resultat.compte.vitrine).toEqual({ numeroTahiti: "A12345", secteur: "vehicules", ile: "Tahiti", commune: "Papeete" });
  });

  test("le numéro TAHITI, le secteur, l'île et la commune sont obligatoires", () => {
    const erreurs = erreursDe({ ...pro, numeroTahiti: "", secteur: "", ile: "", commune: "" });
    expect(Object.keys(erreurs).sort()).toEqual(["commune", "ile", "numeroTahiti", "secteur"]);
  });

  test("le numéro TAHITI n'accepte que lettres, chiffres, espaces et tirets", () => {
    expect(erreursDe({ ...pro, numeroTahiti: "123456-001" }).numeroTahiti).toBeUndefined();
    expect(erreursDe({ ...pro, numeroTahiti: "12/3456" }).numeroTahiti).toBeDefined();
    expect(erreursDe({ ...pro, numeroTahiti: "<script>" }).numeroTahiti).toBeDefined();
    expect(erreursDe({ ...pro, numeroTahiti: "1".repeat(NUMERO_TAHITI_MAX + 1) }).numeroTahiti).toBeDefined();
  });

  test("le secteur et l'île doivent exister", () => {
    expect(erreursDe({ ...pro, secteur: "inconnu" }).secteur).toBeDefined();
    expect(erreursDe({ ...pro, ile: "Atlantide" }).ile).toBeDefined();
  });
});
