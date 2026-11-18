"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { modifierAnnonce, soumettreAnnonce, type EtatDepot } from "@/app/actions";
import { ajouterPhoto } from "@/app/photos-actions";
import { categories } from "@/lib/data";
import {
  DESCRIPTION_MAX,
  ILES,
  PHOTOS_MAX,
  TITRE_MAX,
  verifierPhoto,
  type AnnonceSaisie,
  type ChampAnnonce,
} from "@/lib/validation";

/** Photo choisie, gardée dans le navigateur jusqu'à l'enregistrement de l'annonce. */
type Photo = { id: string; nom: string; url: string; fichier: File };

/** Envoi des photos après l'enregistrement : combien sont parties, et les refus. */
type Envoi = { faites: number; total: number; erreurs: string[]; fini: boolean };

const initial: EtatDepot = { statut: "initial" };

/**
 * Formulaire de dépôt d'une annonce de particulier connecté. `telephone` : celui de son compte.
 * Avec `annonce` : formulaire « Modifier », prérempli ; l'annonce repasse alors en validation.
 */
export function PublishForm({ telephone, annonce }: { telephone: string; annonce?: { id: string; saisie: AnnonceSaisie } }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [envoi, setEnvoi] = useState<Envoi | null>(null);

  /**
   * Dépôt : l'annonce est enregistrée, puis ses photos partent une par une (une requête par
   * photo, pour rester sous la limite d'envoi de l'hébergeur).
   */
  async function deposer(precedent: EtatDepot, formulaire: FormData): Promise<EtatDepot> {
    const resultat = await soumettreAnnonce(precedent, formulaire);
    if (resultat.statut !== "enregistree" || photos.length === 0) return resultat;
    const erreurs: string[] = [];
    for (const [rang, photo] of photos.entries()) {
      setEnvoi({ faites: rang, total: photos.length, erreurs: [...erreurs], fini: false });
      const donnees = new FormData();
      donnees.set("photo", photo.fichier);
      try {
        const envoye = await ajouterPhoto(resultat.id, donnees);
        if (envoye.erreur) erreurs.push(envoye.erreur);
      } catch {
        erreurs.push(`« ${photo.nom} » n'a pas pu être envoyée.`);
      }
    }
    setEnvoi({ faites: photos.length, total: photos.length, erreurs, fini: true });
    return resultat;
  }

  const [etat, envoyer, enCours] = useActionState(annonce ? modifierAnnonce : deposer, initial);
  const [erreursPhotos, setErreursPhotos] = useState<string[]>([]);
  const resume = useRef<HTMLDivElement>(null);


  const erreurs = etat.statut === "erreurs" ? etat.erreurs : {};
  const saisie = etat.statut === "erreurs" ? etat.saisie : annonce?.saisie;
  const nombreErreurs = Object.keys(erreurs).length;
  const general = etat.statut === "erreurs" ? etat.general : undefined;

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
        ajouts.push({ id: `${fichier.name}-${fichier.size}-${fichier.lastModified}`, nom: fichier.name, url: URL.createObjectURL(fichier), fichier });
      }
    }
    setPhotos((actuelles) => [...actuelles, ...ajouts.filter((a) => !actuelles.some((p) => p.id === a.id))]);
    setErreursPhotos(refus);
  }

  function retirerPhoto(photo: Photo) {
    URL.revokeObjectURL(photo.url);
    setPhotos((actuelles) => actuelles.filter((p) => p.id !== photo.id));
  }

  if (etat.statut === "limite") {
    return (
      <div className="stack" role="alert">
        <div className="avis avis-erreur">
          <p>
            <strong>Vous avez déjà {etat.maximum} annonces actives, le maximum pour un particulier.</strong>
          </p>
          <p>Retirez une annonce pour en publier une nouvelle.</p>
        </div>
        <Link className="btn btn-secondary" href="/compte/annonces">
          Voir mes annonces
        </Link>
      </div>
    );
  }

  if (etat.statut === "enregistree") {
    return (
      <div className="stack" role="status">
        <div className="avis">
          <p>
            <strong>Votre annonce « {etat.titre} » est enregistrée.</strong>
          </p>
          <p>
            Elle est en attente de validation par Hoko et apparaîtra sur le site une fois validée. Vous la retrouvez dans
            « Mes annonces ».
          </p>
        </div>
        {envoi && envoi.erreurs.length > 0 && (
          <div className="avis avis-erreur" role="alert">
            <p>
              <strong>Certaines photos n&apos;ont pas été ajoutées.</strong> Vous pourrez les ajouter depuis « Modifier ».
            </p>
            {envoi.erreurs.map((message) => (
              <p key={message} className="small">
                {message}
              </p>
            ))}
          </div>
        )}
        <Link className="btn btn-secondary" href="/compte/annonces">
          Voir mes annonces
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
      {annonce && <input type="hidden" name="id" value={annonce.id} />}
      {annonce && (
        <div className="avis">
          <p>Après modification, Hoko vérifie de nouveau l&apos;annonce : elle quitte le site le temps de la vérification.</p>
        </div>
      )}
      {(nombreErreurs > 0 || general) && (
        <div className="avis avis-erreur" ref={resume} tabIndex={-1} role="alert">
          <strong>
            {general ?? `${nombreErreurs > 1 ? `${nombreErreurs} champs sont à corriger` : "Un champ est à corriger"} avant de publier.`}
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

      {!annonce && (
      <div className="champ">
        <span className="champ-titre" id="titre-photos">
          Photos
        </span>
        <span className="small muted">JPEG uniquement, 4 Mo maximum par photo, {PHOTOS_MAX} photos au plus.</span>
        {/* Sans attribut name : les photos partent une par une après l'enregistrement de l'annonce */}
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
      )}

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
        <span className="champ-titre">Votre numéro de téléphone</span>
        <span>{telephone}</span>
        <span className="small muted">Celui de votre compte. Il n&apos;apparaît qu&apos;au clic sur « Voir le numéro ».</span>
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
        {enCours ? "Enregistrement…" : annonce ? "Envoyer les modifications" : "Publier l'annonce"}
      </button>
      {enCours && envoi && !envoi.fini && (
        <p className="small" role="status">
          Envoi des photos : {envoi.faites + 1} sur {envoi.total}… Gardez cette page ouverte.
        </p>
      )}
    </form>
  );
}
