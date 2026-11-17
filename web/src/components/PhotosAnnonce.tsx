"use client";

import { useState } from "react";
import { ajouterPhoto, photoEnPremier, supprimerPhoto } from "@/app/photos-actions";
import type { Photo } from "@/lib/photos";
import { PHOTOS_MAX, verifierPhoto } from "@/lib/validation";
import { PhotoCadree } from "./PhotoCadree";

/**
 * Photos d'une annonce existante, sur la page « Modifier » : ajouter, supprimer, choisir la
 * première (la vignette). Chaque geste est enregistré tout de suite, sans autre bouton.
 */
export function PhotosAnnonce({ annonceId, photos: depart }: { annonceId: string; photos: Photo[] }) {
  const [photos, setPhotos] = useState(depart);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [ajoutFait, setAjoutFait] = useState(false);

  async function ajouter(fichiers: FileList | null) {
    if (!fichiers || fichiers.length === 0) return;
    const refus: string[] = [];
    let actuelles = photos;
    for (const [rang, fichier] of Array.from(fichiers).entries()) {
      const probleme = verifierPhoto(fichier);
      if (probleme) {
        refus.push(probleme);
        continue;
      }
      if (actuelles.length >= PHOTOS_MAX) {
        refus.push(`« ${fichier.name} » n'a pas été ajoutée : ${PHOTOS_MAX} photos au maximum.`);
        continue;
      }
      setOccupe(`Envoi de la photo ${rang + 1} sur ${fichiers.length}…`);
      const donnees = new FormData();
      donnees.set("photo", fichier);
      try {
        const resultat = await ajouterPhoto(annonceId, donnees);
        if (resultat.photo) {
          actuelles = [...actuelles, resultat.photo];
          setPhotos(actuelles);
          setAjoutFait(true);
        } else if (resultat.erreur) {
          refus.push(resultat.erreur);
        }
      } catch {
        refus.push(`« ${fichier.name} » n'a pas pu être envoyée.`);
      }
    }
    setOccupe(null);
    setErreurs(refus);
  }

  async function supprimer(photo: Photo) {
    setOccupe("Suppression…");
    const { erreur } = await supprimerPhoto(photo.id);
    setOccupe(null);
    if (erreur) return setErreurs([erreur]);
    setErreurs([]);
    setPhotos((actuelles) => actuelles.filter((p) => p.id !== photo.id));
  }

  async function enPremier(photo: Photo) {
    setOccupe("Enregistrement…");
    const { erreur } = await photoEnPremier(photo.id);
    setOccupe(null);
    if (erreur) return setErreurs([erreur]);
    setErreurs([]);
    setPhotos((actuelles) => [photo, ...actuelles.filter((p) => p.id !== photo.id)]);
  }

  return (
    <section className="carte stack" aria-labelledby="titre-photos-annonce">
      <div className="section-head">
        <h2 id="titre-photos-annonce">Photos</h2>
        <span className="small muted">
          {photos.length} sur {PHOTOS_MAX}
        </span>
      </div>
      <p className="small muted">
        JPEG, 4 Mo au plus par photo. La première sert de vignette. Une photo ajoutée est vérifiée par Hoko : l&apos;annonce
        quitte le site le temps de la vérification.
      </p>

      {photos.length > 0 ? (
        <ul className="vignettes vignettes-gestion">
          {photos.map((photo, rang) => (
            <li key={photo.id}>
              <PhotoCadree src={photo.vignette} alt={`Photo ${rang + 1}`} />
              {rang === 0 ? (
                <span className="small vignette-premiere">Vignette</span>
              ) : (
                <button type="button" className="link small" disabled={occupe !== null} onClick={() => enPremier(photo)}>
                  Mettre en premier
                </button>
              )}
              <button type="button" disabled={occupe !== null} onClick={() => supprimer(photo)} aria-label={`Supprimer la photo ${rang + 1}`}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Pas encore de photo. Une annonce avec photos est bien plus consultée.</p>
      )}

      {photos.length < PHOTOS_MAX && (
        <div>
          <label className={`btn btn-secondary depot${occupe ? " desactive" : ""}`} htmlFor="ajout-photos">
            Ajouter des photos
          </label>
          <input
            id="ajout-photos"
            className="cache"
            type="file"
            accept="image/jpeg"
            multiple
            disabled={occupe !== null}
            onChange={(event) => {
              void ajouter(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      )}

      {occupe && (
        <p className="small" role="status">
          {occupe}
        </p>
      )}
      {ajoutFait && !occupe && (
        <p className="small" role="status">
          Photos enregistrées. L&apos;annonce est renvoyée à la validation.
        </p>
      )}
      {erreurs.length > 0 && (
        <div className="erreur" role="alert">
          {erreurs.map((message) => (
            <span key={message}>{message}</span>
          ))}
        </div>
      )}
    </section>
  );
}
