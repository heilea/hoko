/**
 * Tests du dépôt d'annonce (page « Publier une annonce »).
 *
 * Lancer : npm test (depuis le dossier web)
 *
 * Ils portent sur les règles de src/lib/validation.ts : ce qu'on accepte, ce qu'on refuse,
 * et le message montré au vendeur.
 */
import { describe, expect, test } from "vitest";
import {
  DESCRIPTION_MAX,
  formaterTelephone,
  lirePrix,
  PHOTO_POIDS_MAX,
  TITRE_MAX,
  validerAnnonce,
  verifierPhoto,
} from "../src/lib/validation";

/** Une saisie correcte, à modifier champ par champ dans chaque test. */
const saisieValide = {
  titre: "Scooter 125 cm³, 14 000 km",
  categorie: "vehicules",
  prix: "220 000",
  description: "Scooter de 2021, toujours entretenu chez le concessionnaire.",
  ile: "Tahiti",
  commune: "Papeete",
  accord: true,
};

const erreursDe = (modifs) => {
  const resultat = validerAnnonce({ ...saisieValide, ...modifs });
  return resultat.ok ? {} : resultat.erreurs;
};

describe("annonce complète", () => {
  test("une saisie correcte est acceptée et nettoyée", () => {
    const resultat = validerAnnonce({ ...saisieValide, titre: "  Scooter   125 cm³  ", commune: " Papeete " });
    expect(resultat.ok).toBe(true);
    expect(resultat.annonce).toEqual({
      titre: "Scooter 125 cm³",
      categorie: "vehicules",
      prixXpf: 220000,
      description: saisieValide.description,
      ile: "Tahiti",
      commune: "Papeete",
    });
  });

  test("un formulaire vide signale chaque champ", () => {
    const erreurs = erreursDe({ titre: "", categorie: "", prix: "", description: "", ile: "", commune: "", accord: false });
    expect(Object.keys(erreurs).sort()).toEqual(
      ["accord", "categorie", "commune", "description", "ile", "prix", "titre"].sort(),
    );
  });
});

describe("titre, catégorie et lieu", () => {
  test("le titre est obligatoire et limité en longueur", () => {
    expect(erreursDe({ titre: "   " }).titre).toBeTruthy();
    expect(erreursDe({ titre: "a".repeat(TITRE_MAX) }).titre).toBeUndefined();
    expect(erreursDe({ titre: "a".repeat(TITRE_MAX + 1) }).titre).toBeTruthy();
  });

  test("la catégorie doit exister", () => {
    expect(erreursDe({ categorie: "categorie-inconnue" }).categorie).toBeTruthy();
    expect(erreursDe({ categorie: "nautisme" }).categorie).toBeUndefined();
  });

  test("l'île doit être dans la liste et la commune est obligatoire", () => {
    expect(erreursDe({ ile: "Atlantide" }).ile).toBeTruthy();
    expect(erreursDe({ commune: "  " }).commune).toBeTruthy();
  });
});

describe("prix en XPF", () => {
  test("accepte les écritures courantes", () => {
    expect(lirePrix("25000")).toBe(25000);
    expect(lirePrix("25 000")).toBe(25000);
    expect(lirePrix("25 000 XPF")).toBe(25000);
    expect(lirePrix("2 400 000 xpf")).toBe(2400000);
  });

  test("refuse les centimes, les lettres, zéro et les montants négatifs", () => {
    expect(lirePrix("25000,50")).toBeNull();
    expect(lirePrix("25000.50")).toBeNull();
    expect(lirePrix("vingt mille")).toBeNull();
    expect(lirePrix("0")).toBeNull();
    expect(lirePrix("-500")).toBeNull();
    expect(lirePrix("")).toBeNull();
  });

  test("le formulaire refuse un prix invalide", () => {
    expect(erreursDe({ prix: "" }).prix).toBeTruthy();
    expect(erreursDe({ prix: "25000,50" }).prix).toBeTruthy();
  });
});

describe("description", () => {
  test("trop courte ou trop longue : refusée", () => {
    expect(erreursDe({ description: "Trop court" }).description).toBeTruthy();
    expect(erreursDe({ description: "a".repeat(DESCRIPTION_MAX + 1) }).description).toBeTruthy();
    expect(erreursDe({ description: "a".repeat(DESCRIPTION_MAX) }).description).toBeUndefined();
  });

  test("une adresse e-mail dans la description est refusée", () => {
    // Règle Hoko : l'e-mail n'est jamais affiché, le contact passe par le téléphone.
    expect(erreursDe({ description: "Écrivez-moi à teva@exemple.pf pour plus de photos." }).description).toMatch(/e-mail/);
  });
});

describe("téléphone du vendeur", () => {
  test("met le numéro au format 87 12 34 56", () => {
    expect(formaterTelephone("87123456")).toBe("87 12 34 56");
    expect(formaterTelephone("87.12.34.56")).toBe("87 12 34 56");
    expect(formaterTelephone("87-12-34-56")).toBe("87 12 34 56");
    expect(formaterTelephone("+689 87 12 34 56")).toBe("87 12 34 56");
  });

  test("refuse un numéro qui n'a pas 8 chiffres", () => {
    expect(formaterTelephone("8712345")).toBeNull();
    expect(formaterTelephone("871234567")).toBeNull();
    expect(formaterTelephone("numéro")).toBeNull();
  });

  test("le vendeur doit accepter que son numéro soit affiché", () => {
    expect(erreursDe({ accord: false }).accord).toBeTruthy();
  });
});

describe("photos", () => {
  const photo = (modifs) => ({ name: "photo.jpg", type: "image/jpeg", size: 1024 * 1024, ...modifs });

  test("une photo JPEG de moins de 4 Mo est acceptée", () => {
    expect(verifierPhoto(photo())).toBeNull();
    expect(verifierPhoto(photo({ size: PHOTO_POIDS_MAX }))).toBeNull();
  });

  test("les autres formats sont refusés", () => {
    expect(verifierPhoto(photo({ name: "photo.png", type: "image/png" }))).toMatch(/JPEG/);
    expect(verifierPhoto(photo({ name: "photo.webp", type: "image/webp" }))).toMatch(/JPEG/);
    expect(verifierPhoto(photo({ name: "doc.pdf", type: "application/pdf" }))).toMatch(/JPEG/);
  });

  test("une photo de plus de 4 Mo est refusée", () => {
    expect(verifierPhoto(photo({ size: PHOTO_POIDS_MAX + 1 }))).toMatch(/4 Mo/);
  });
});
