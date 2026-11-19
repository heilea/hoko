"use server";

/**
 * Photos d'annonce : ajout, suppression, choix de la première.
 *
 * Une photo est envoyée seule, dans sa propre requête : un hébergement comme Vercel refuse les
 * envois de plus de 4,5 Mo, et une photo fait 4 Mo au plus. Le serveur la vérifie et la traite
 * (photos-traitement.ts), dépose la grande image et la vignette dans le stockage Supabase avec
 * la clé secrète (un compte ne peut pas y déposer lui-même), dans le dossier du compte, puis l'inscrit dans la base (fonction `ajouter_photo`, qui vérifie
 * que l'annonce est bien celle du compte et la limite de 6 photos).
 */
import { updateTag } from "next/cache";
import { TAG_ANNONCES } from "@/lib/annonces-donnees";
import { MESSAGE_EN_ATTENTE } from "@/lib/accounts";
import { adressePhoto, cheminVignette, nouveauChemin, type Photo } from "@/lib/photos";
import { traiterPhoto } from "@/lib/photos-traitement";
import { getSession } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase-serveur";
import { stockagePhotos } from "@/lib/supabase-stockage";

export type ResultatPhoto = { photo?: Photo; erreur?: string };

const INDISPONIBLE = "L'envoi des photos est indisponible pour le moment. Réessayez plus tard.";

function idValide(valeur: unknown): number | null {
  const id = Number(valeur);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function ajouterPhoto(annonceId: string, formulaire: FormData): Promise<ResultatPhoto> {
  const compte = await getSession();
  // Particulier ou pro : la base vérifie que l'annonce est bien celle du compte
  if (!compte) return { erreur: "Connectez-vous avec votre compte pour ajouter des photos." };
  const annonce = idValide(annonceId);
  const fichier = formulaire.get("photo");
  if (!annonce || !(fichier instanceof File)) return { erreur: "Aucune photo reçue." };

  const traitee = await traiterPhoto(new Uint8Array(await fichier.arrayBuffer()));
  if ("erreur" in traitee) return { erreur: `« ${fichier.name.slice(0, 80)} » : ${traitee.erreur}` };

  const supabase = await creerClientServeur();
  const stockage = stockagePhotos();
  if (!supabase || !stockage) return { erreur: INDISPONIBLE };

  const chemin = nouveauChemin(compte.id, annonce, crypto.randomUUID());
  const fichiers = [chemin, cheminVignette(chemin)];
  const options = { contentType: "image/jpeg", cacheControl: "31536000", upsert: false };
  const envois = await Promise.all([
    stockage.upload(fichiers[0], traitee.grande, options),
    stockage.upload(fichiers[1], traitee.vignette, options),
  ]);
  if (envois.some((envoi) => envoi.error)) {
    console.error("Photo refusée par le stockage :", envois.map((envoi) => envoi.error?.message).filter(Boolean));
    await stockage.remove(fichiers);
    return { erreur: INDISPONIBLE };
  }

  const { data: id, error } = await supabase.rpc("ajouter_photo", { annonce_id: annonce, chemin });
  if (error || !id) {
    // La base refuse : les fichiers déposés ne doivent pas rester orphelins
    await stockage.remove(fichiers);
    console.error("Photo refusée par la base :", error?.code);
    if (error?.code === "23514" && error.hint === "en_attente") return { erreur: MESSAGE_EN_ATTENTE };
    if (error?.code === "23514") return { erreur: "Une annonce a 6 photos au plus." };
    if (error?.code === "P0002") return { erreur: "Cette annonce est introuvable." };
    return { erreur: INDISPONIBLE };
  }

  updateTag(TAG_ANNONCES);
  return { photo: { id, grande: adressePhoto(fichiers[0]), vignette: adressePhoto(fichiers[1]) } };
}

export async function supprimerPhoto(photoId: number): Promise<{ erreur?: string }> {
  const compte = await getSession();
  const id = idValide(photoId);
  if (!compte || !id) return { erreur: "Cette photo est introuvable." };
  const supabase = await creerClientServeur();
  const stockage = stockagePhotos();
  if (!supabase || !stockage) return { erreur: INDISPONIBLE };

  // La base vérifie que la photo est celle du compte, et renvoie son chemin
  const { data: chemin, error } = await supabase.rpc("supprimer_photo", { photo_id: id });
  if (error || !chemin) return { erreur: "Cette photo est introuvable." };
  // La photo n'est plus dans l'annonce ; ses fichiers sont effacés du stockage
  const { error: effacement } = await stockage.remove([chemin, cheminVignette(chemin)]);
  if (effacement) console.error("Fichiers de photo non effacés :", effacement.message);
  updateTag(TAG_ANNONCES);
  return {};
}

export async function photoEnPremier(photoId: number): Promise<{ erreur?: string }> {
  const compte = await getSession();
  const id = idValide(photoId);
  if (!compte || !id) return { erreur: "Cette photo est introuvable." };
  const supabase = await creerClientServeur();
  if (!supabase) return { erreur: INDISPONIBLE };
  const { error } = await supabase.rpc("photo_en_premier", { photo_id: id });
  if (error) return { erreur: "Cette photo est introuvable." };
  updateTag(TAG_ANNONCES);
  return {};
}
