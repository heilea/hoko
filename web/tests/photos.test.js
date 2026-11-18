/**
 * Tests des photos d'annonce : traitement par sharp, adresses, et règles de la base.
 *
 * Lancer : npm test (depuis le dossier web)
 *
 * Le traitement est essayé sur de vraies images fabriquées par sharp : une photo de « téléphone »
 * avec position GPS et orientation, une image PNG déguisée, un fichier trop lourd.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { adressePhoto, cheminVignette, COTE_GRANDE, COTE_VIGNETTE, nouveauChemin, versPhotos } from "../src/lib/photos";
import { commeUnJpeg, traiterPhoto } from "../src/lib/photos-traitement";
import { PHOTO_POIDS_MAX } from "../src/lib/validation";

const dossier = join(import.meta.dirname, "..", "supabase", "migrations");
const migrations = readdirSync(dossier).sort().map((nom) => readFileSync(join(dossier, nom), "utf8")).join("\n");
const fonctionSql = (nom) => {
  const debut = migrations.indexOf(`create function public.${nom}(`);
  return migrations.slice(debut, migrations.indexOf("$$;", debut));
};

/** Une photo de téléphone : 3000 × 2000, couchée (orientation 6), avec position GPS. */
async function photoDeTelephone() {
  return sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 30, g: 120, b: 160 } } })
    .jpeg()
    .withExif({ IFD0: { Make: "Telephone" }, IFD3: { GPSLatitudeRef: "S", GPSLatitude: "17/1 32/1 0/1" } })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

describe("traitement d'une photo", () => {
  test("la photo d'origine porte bien une position GPS (contrôle de l'essai)", async () => {
    const infos = await sharp(await photoDeTelephone()).metadata();
    expect(infos.exif).toBeDefined();
    expect(infos.orientation).toBe(6);
  });

  test("la position GPS et toutes les métadonnées disparaissent", async () => {
    const resultat = await traiterPhoto(new Uint8Array(await photoDeTelephone()));
    expect(resultat.erreur).toBeUndefined();
    for (const image of [resultat.grande, resultat.vignette]) {
      const infos = await sharp(image).metadata();
      expect(infos.format).toBe("jpeg");
      expect(infos.exif).toBeUndefined();
      expect(infos.orientation).toBeUndefined();
    }
  });

  test("l'image est redressée, puis réduite à 1600 px (grande) et 480 px (vignette)", async () => {
    const { grande, vignette } = await traiterPhoto(new Uint8Array(await photoDeTelephone()));
    const g = await sharp(grande).metadata();
    const v = await sharp(vignette).metadata();
    // Orientation 6 : la photo prise en hauteur devient verticale
    expect(g.height).toBe(COTE_GRANDE);
    expect(g.width).toBeLessThan(g.height);
    expect(Math.max(v.width, v.height)).toBe(COTE_VIGNETTE);
  });

  test("une petite image n'est pas agrandie", async () => {
    const petite = await sharp({ create: { width: 300, height: 200, channels: 3, background: "white" } }).jpeg().toBuffer();
    const { grande } = await traiterPhoto(new Uint8Array(petite));
    expect((await sharp(grande).metadata()).width).toBe(300);
  });

  test("une image PNG est refusée, même renommée en .jpg", async () => {
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } }).png().toBuffer();
    expect(commeUnJpeg(new Uint8Array(png))).toBe(false);
    expect((await traiterPhoto(new Uint8Array(png))).erreur).toMatch(/JPEG/);
  });

  test("un faux JPEG (bon début, contenu illisible) est refusé", async () => {
    const faux = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect((await traiterPhoto(faux)).erreur).toBeTruthy();
  });

  test("un fichier vide ou de plus de 4 Mo est refusé", async () => {
    expect((await traiterPhoto(new Uint8Array(0))).erreur).toBeTruthy();
    const lourd = new Uint8Array(PHOTO_POIDS_MAX + 1);
    lourd.set([0xff, 0xd8, 0xff]);
    expect((await traiterPhoto(lourd)).erreur).toMatch(/4 Mo/);
  });
});

describe("adresses des photos", () => {
  test("la vignette porte le même nom terminé par -v.jpg", () => {
    expect(cheminVignette("compte/12/abc.jpg")).toBe("compte/12/abc-v.jpg");
  });

  test("une photo est rangée dans le dossier du compte et de l'annonce", () => {
    expect(nouveauChemin("u1", 12, "abc")).toBe("u1/12/abc.jpg");
  });

  test("l'adresse publique pointe vers l'espace photos de Supabase", () => {
    expect(adressePhoto("u1/12/abc.jpg")).toMatch(/\/storage\/v1\/object\/public\/photos\/u1\/12\/abc\.jpg$/);
  });

  test("les photos sont rendues dans l'ordre : la première sert de vignette", () => {
    const photos = versPhotos([
      { id: 3, chemin: "u/1/c.jpg", ordre: 2 },
      { id: 1, chemin: "u/1/a.jpg", ordre: 0 },
      { id: 2, chemin: "u/1/b.jpg", ordre: 1 },
    ]);
    expect(photos.map((p) => p.id)).toEqual([1, 2, 3]);
    expect(photos[0].vignette).toMatch(/a-v\.jpg$/);
    expect(versPhotos(null)).toEqual([]);
  });
});

describe("règles de la base pour les photos", () => {
  test("6 photos au plus, dans le dossier du compte et de l'annonce", () => {
    const sql = fonctionSql("ajouter_photo");
    expect(sql).toContain("nombre >= 6");
    expect(sql).toContain("(select auth.uid())::text || '/' || annonce_id::text");
  });

  test("une photo ajoutée renvoie l'annonce à la validation", () => {
    expect(fonctionSql("ajouter_photo")).toContain("set statut = 'en_attente_validation'");
  });

  test("seul le propriétaire retire ou réordonne ses photos", () => {
    expect(fonctionSql("supprimer_photo")).toContain("l.user_id = (select auth.uid())");
    expect(fonctionSql("photo_en_premier")).toContain("l.user_id = (select auth.uid())");
  });

  test("l'annonceur n'écrit pas directement dans la table photos", () => {
    expect(migrations).toContain("revoke insert, update, delete on public.photos from authenticated, anon;");
  });

  test("le stockage n'accepte que des JPEG", () => {
    expect(migrations).toContain("array['image/jpeg']");
  });

  test("un compte ne dépose ni n'efface lui-même dans le stockage : seul le serveur le fait", () => {
    for (const regle of ["lecture", "dépôt", "suppression"]) {
      const nom = `"photos stockage : ${regle} par l'annonceur"`;
      expect(migrations.lastIndexOf(`drop policy ${nom}`), regle).toBeGreaterThan(migrations.lastIndexOf(`create policy ${nom}`));
    }
  });

  test("la clé secrète ne sert que côté serveur, sans préfixe public", () => {
    const code = readFileSync(join(import.meta.dirname, "..", "src", "lib", "supabase-stockage.ts"), "utf8");
    expect(code).toContain("process.env.SUPABASE_SECRET_KEY");
    expect(code).not.toContain("NEXT_PUBLIC_SUPABASE_SECRET");
  });
});
