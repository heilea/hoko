/**
 * Traitement d'une photo envoyée par un annonceur, avant de la stocker. Serveur uniquement.
 *
 * On ne fait jamais confiance au fichier reçu : son nom et son type annoncés peuvent mentir.
 * 1. Taille : 4 Mo au plus (SPEC.md).
 * 2. Contenu : il doit commencer comme un JPEG, et sharp doit le lire comme un JPEG.
 * 3. L'image est redressée (orientation du téléphone), réduite, puis réenregistrée : sharp ne
 *    recopie aucune métadonnée, la position GPS, le modèle du téléphone et la date disparaissent.
 */
import sharp from "sharp";
import { PHOTO_POIDS_MAX } from "./validation";
import { COTE_GRANDE, COTE_VIGNETTE } from "./photos";

export type PhotoTraitee = { grande: Buffer; vignette: Buffer };

/** Les trois premiers octets d'un fichier JPEG. */
export function commeUnJpeg(octets: Uint8Array): boolean {
  return octets.length > 3 && octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff;
}

/** Renvoie le message d'erreur à montrer, ou les deux images prêtes à stocker. */
export async function traiterPhoto(octets: Uint8Array): Promise<PhotoTraitee | { erreur: string }> {
  if (octets.length === 0) return { erreur: "Le fichier est vide." };
  if (octets.length > PHOTO_POIDS_MAX) return { erreur: "La photo dépasse 4 Mo." };
  if (!commeUnJpeg(octets)) return { erreur: "Ce fichier n'est pas une photo JPEG." };

  try {
    // Refuse les images démesurées (plus de 50 millions de pixels) avant de les décoder
    const image = sharp(octets, { failOn: "error", limitInputPixels: 50_000_000 });
    const infos = await image.metadata();
    if (infos.format !== "jpeg") return { erreur: "Ce fichier n'est pas une photo JPEG." };

    // rotate() sans argument applique l'orientation enregistrée par le téléphone
    const redressee = image.rotate();
    const [grande, vignette] = await Promise.all([
      redressee
        .clone()
        .resize(COTE_GRANDE, COTE_GRANDE, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer(),
      redressee
        .clone()
        .resize(COTE_VIGNETTE, COTE_VIGNETTE, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 75, mozjpeg: true })
        .toBuffer(),
    ]);
    return { grande, vignette };
  } catch {
    return { erreur: "Cette photo est illisible. Essayez avec une autre." };
  }
}
