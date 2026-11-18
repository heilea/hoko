/**
 * Adresses des photos d'annonce. Fonctions pures, utilisables partout (serveur et navigateur).
 *
 * Chaque photo est stockée en deux fichiers dans l'espace Supabase « photos » :
 * `<compte>/<annonce>/<nom>.jpg` (grande image) et `<compte>/<annonce>/<nom>-v.jpg` (vignette).
 * Le traitement (vérification, GPS retiré, réduction) est dans `photos-traitement.ts`.
 */

/** Nom de l'espace de stockage. */
export const ESPACE_PHOTOS = "photos";

/** Plus grand côté de la grande image et de la vignette, en pixels. */
export const COTE_GRANDE = 1600;
export const COTE_VIGNETTE = 480;

/** Une photo d'annonce prête à afficher. */
export type Photo = { id: number; grande: string; vignette: string };

export function cheminVignette(chemin: string): string {
  return chemin.replace(/\.jpg$/, "-v.jpg");
}

/** Adresse publique d'un fichier de l'espace « photos ». */
export function adressePhoto(chemin: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${ESPACE_PHOTOS}/${chemin.split("/").map(encodeURIComponent).join("/")}`;
}

/** Photos lues dans la base, dans l'ordre (la première sert de vignette de l'annonce). */
export function versPhotos(lignes: { id: number; chemin: string; ordre: number }[] | null | undefined): Photo[] {
  return [...(lignes ?? [])]
    .sort((a, b) => a.ordre - b.ordre || a.id - b.id)
    .map((ligne) => ({ id: ligne.id, grande: adressePhoto(ligne.chemin), vignette: adressePhoto(cheminVignette(ligne.chemin)) }));
}

/** Chemin d'une nouvelle photo : dans le dossier du compte et de l'annonce, nom au hasard. */
export function nouveauChemin(compte: string, annonce: number, nom: string): string {
  return `${compte}/${annonce}/${nom}.jpg`;
}
