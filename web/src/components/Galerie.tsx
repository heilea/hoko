"use client";

import type { MouseEvent } from "react";
import type { Photo } from "@/lib/photos";
import { PhotoCadree } from "./PhotoCadree";

/**
 * Photos d'une annonce : une bande de photos qu'on fait glisser du doigt (ou avec les flèches
 * du trackpad), et les vignettes pour aller à une photo.
 *
 * Tout marche sans JavaScript : la bande défile d'elle-même (CSS scroll-snap) et chaque
 * vignette est un lien vers sa photo (#photo-2). Le script ne fait qu'éviter que la page entière
 * saute vers la photo quand on touche une vignette.
 */
export function Galerie({ photos, titre }: { photos: Photo[]; titre: string }) {
  if (photos.length === 0) return null;

  function allerA(event: MouseEvent<HTMLAnchorElement>, rang: number) {
    const bande = event.currentTarget.closest(".galerie")?.querySelector<HTMLElement>(".galerie-bande");
    if (!bande) return;
    event.preventDefault();
    bande.scrollTo({ left: rang * bande.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="galerie">
      <ul className="galerie-bande" aria-label={`Photos de l'annonce (${photos.length})`}>
        {photos.map((photo, rang) => (
          <li key={photo.id} id={`photo-${rang + 1}`}>
            <PhotoCadree src={photo.grande} alt={`${titre}, photo ${rang + 1} sur ${photos.length}`} paresseuse={rang > 0} />
          </li>
        ))}
      </ul>
      {photos.length > 1 && (
        <ul className="galerie-choix" aria-label="Aller à une photo">
          {photos.map((photo, rang) => (
            <li key={photo.id}>
              <a href={`#photo-${rang + 1}`} aria-label={`Photo ${rang + 1}`} onClick={(event) => allerA(event, rang)}>
                <PhotoCadree src={photo.vignette} alt="" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
