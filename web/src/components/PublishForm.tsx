"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { soumettreAnnonce, type EtatDepot } from "@/app/actions";
import { categories } from "@/lib/data";
import { prixXpf } from "@/lib/format";
import {
  DESCRIPTION_MAX,
  ILES,
  PHOTOS_MAX,
  TITRE_MAX,
  verifierPhoto,
  type ChampAnnonce,
} from "@/lib/validation";
import { Icon } from "./Icon";

type Photo = { id: string; nom: string; url: string };

const initial: EtatDepot = { statut: "initial" };

/** Formulaire de dépôt d'une annonce de particulier. */
export function PublishForm() {
  const [etat, envoyer, enCours] = useActionState(soumettreAnnonce, initial);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [erreursPhotos, setErreursPhotos] = useState<string[]>([]);
  const resume = useRef<HTMLDivElement>(null);

  const erreurs = etat.statut === "erreurs" ? etat.erreurs : {};
  const saisie = etat.statut === "erreurs" ? etat.saisie : undefined;
  const nombreErreurs = Object.keys(erreurs).length;

  // Après un envoi refusé, on amène le lecteur sur le résumé des erreurs
  useEffect(() => {
    if (etat.statut === "erreurs") resume.current?.focus();
  }, [etat]);

  function ajouterPhotos(fichiers: FileList | null) {
    if (!fichiers) return;
    const refus: string[] = [];
    const ajouts: Photo[] = [];
    for (const fichier of Array.from(fichiers)) {
      const probleme = verifierPhoto(fichier);
      if (probleme) {
        refus.push(probleme);
      } else if (photos.length + ajouts.length >= PHOTOS_MAX) {
        refus.push(`« ${fichier.name} » n'a pas été ajoutée : ${PHOTOS_MAX} photos au maximum.`);
      } else {
        ajouts.push({ id: `${fichier.name}-${fichier.size}-${fichier.lastModified}`, nom: fichier.name, url: URL.createObjectURL(fichier) });
      }
    }
    setPhotos((actuelles) => [...actuelles, ...ajouts.filter((a) => !actuelles.some((p) => p.id === a.id))]);
    setErreursPhotos(refus);
  }

  function retirerPhoto(photo: Photo) {
    URL.revokeObjectURL(photo.url);
    setPhotos((actuelles) => actuelles.filter((p) => p.id !== photo.id));
  }

  if (etat.statut === "valide") {
    const { annonce } = etat;
    const categorie = categories.find((c) => c.slug === annonce.categorie);
    return (
      <div className="stack" role="status">
        <div className="avis">
          <p>
            <strong>Votre annonce est complète, mais elle n&apos;a pas été publiée.</strong>
          </p>
          <p>L&apos;enregistrement des annonces n&apos;est pas encore ouvert sur Hoko. Voici l&apos;aperçu de ce qu&apos;elle donnera.</p>
        </div>
        <div className="annonce apercu">
          <div className="photo">
            {photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- aperçu local d'un fichier choisi par l'utilisateur
              <img src={photos[0].url} alt="" />
            ) : (
              categorie && <Icon name={categorie.icone} />
            )}
          </div>
          <div className="corps">
            <h3>{annonce.titre}</h3>
            <span className="price">{prixXpf(annonce.prixXpf)}</span>
            <span className="small muted lieu">
              <Icon name="lieu" />
              {annonce.commune}, {annonce.ile} · {categorie?.nom}
            </span>
          </div>
        </div>
        <dl className="details">
          <dt>Description</dt>
          <dd className="description">{annonce.description}</dd>
          <dt>Téléphone</dt>
          <dd>{annonce.telephone} (affiché au clic sur « Voir le numéro »)</dd>
          <dt>Photos</dt>
          <dd>{photos.length > 0 ? `${photos.length} choisie${photos.length > 1 ? "s" : ""}` : "Aucune"}</dd>
        </dl>
        <Link className="btn btn-secondary" href="/">
          Revenir à l&apos;accueil
        </Link>
      </div>
    );
  }

  const champ = (nom: ChampAnnonce) => ({
    "aria-invalid": erreurs[nom] ? true : undefined,
    "aria-describedby": erreurs[nom] ? `erreur-${nom}` : undefined,
  });
  const erreur = (nom: ChampAnnonce) =>
    erreurs[nom] && (
      <span className="erreur" id={`erreur-${nom}`}>
        {erreurs[nom]}
      </span>
    );

  return (
    <form className="formulaire" action={envoyer} noValidate>
      {nombreErreurs > 0 && (
        <div className="avis avis-erreur" ref={resume} tabIndex={-1} role="alert">
          <strong>
            {nombreErreurs > 1 ? `${nombreErreurs} champs sont à corriger` : "Un champ est à corriger"} avant de publier.
          </strong>
        </div>
      )}

      <div className="champ">
        <label htmlFor="titre">Titre de l&apos;annonce</label>
        <input id="titre" name="titre" type="text" maxLength={TITRE_MAX} defaultValue={saisie?.titre} placeholder="Scooter 125 cm³, 14 000 km" {...champ("titre")} />
        {erreur("titre")}
      </div>

      <div className="champ-ligne">
        <div className="champ">
          <label htmlFor="categorie">Catégorie</label>
          <select id="categorie" name="categorie" defaultValue={saisie?.categorie ?? ""} {...champ("categorie")}>
            <option value="" disabled>
              Choisir
            </option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nom}
              </option>
            ))}
          </select>
          {erreur("categorie")}
        </div>
        <div className="champ">
          <label htmlFor="prix">Prix en XPF</label>
          <input id="prix" name="prix" type="text" inputMode="numeric" defaultValue={saisie?.prix} placeholder="25 000" {...champ("prix")} />
          {erreur("prix")}
        </div>
      </div>

      <div className="champ">
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" maxLength={DESCRIPTION_MAX} defaultValue={saisie?.description} placeholder="État, année, raison de la vente, ce qui est fourni avec…" {...champ("description")} />
        {erreur("description")}
      </div>

      <div className="champ">
        <span className="champ-titre" id="titre-photos">
          Photos
        </span>
        <span className="small muted">JPEG uniquement, 4 Mo maximum par photo, {PHOTOS_MAX} photos au plus.</span>
        {/* Sans attribut name : les photos ne sont pas envoyées tant que le stockage n'existe pas */}
        <label className="btn btn-secondary depot" htmlFor="photos">
          Ajouter des photos
        </label>
        <input
          id="photos"
          className="cache"
          type="file"
          accept="image/jpeg"
          multiple
          aria-labelledby="titre-photos"
          onChange={(event) => {
            ajouterPhotos(event.target.files);
            event.target.value = "";
          }}
        />
        {erreursPhotos.length > 0 && (
          <span className="erreur" role="alert">
            {erreursPhotos.map((message) => (
              <span key={message}>{message}</span>
            ))}
          </span>
        )}
        {photos.length > 0 && (
          <ul className="vignettes">
            {photos.map((photo) => (
              <li key={photo.id}>
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local d'un fichier choisi par l'utilisateur */}
                <img src={photo.url} alt={photo.nom} />
                <button type="button" onClick={() => retirerPhoto(photo)} aria-label={`Retirer ${photo.nom}`}>
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="champ-ligne">
        <div className="champ">
          <label htmlFor="ile">Île</label>
          <select id="ile" name="ile" defaultValue={saisie?.ile ?? ""} {...champ("ile")}>
            <option value="" disabled>
              Choisir
            </option>
            {ILES.map((ile) => (
              <option key={ile}>{ile}</option>
            ))}
          </select>
          {erreur("ile")}
        </div>
        <div className="champ">
          <label htmlFor="commune">Commune</label>
          <input id="commune" name="commune" type="text" defaultValue={saisie?.commune} placeholder="Papeete" autoComplete="address-level2" {...champ("commune")} />
          {erreur("commune")}
        </div>
      </div>

      <div className="champ">
        <label htmlFor="telephone">Votre numéro de téléphone</label>
        <input id="telephone" name="telephone" type="tel" inputMode="tel" defaultValue={saisie?.telephone} placeholder="87 12 34 56" autoComplete="tel" {...champ("telephone")} />
        {erreur("telephone")}
      </div>

      <div className="champ">
        <label className="case" htmlFor="accord">
          <input id="accord" name="accord" type="checkbox" defaultChecked={saisie?.accord} {...champ("accord")} />
          <span>
            J&apos;accepte que mon numéro soit visible par les visiteurs qui cliquent sur « Voir le numéro ». Mon e-mail
            n&apos;est jamais affiché.
          </span>
        </label>
        {erreur("accord")}
      </div>

      <button className="btn btn-primary" type="submit" disabled={enCours}>
        {enCours ? "Vérification…" : "Publier l'annonce"}
      </button>
    </form>
  );
}
