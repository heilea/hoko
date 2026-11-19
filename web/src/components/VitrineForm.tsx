"use client";

import { useActionState, useEffect, useRef } from "react";
import { modifierVitrine, type EtatVitrine } from "@/app/actions";
import { categories } from "@/lib/data";
import { ILES } from "@/lib/validation";
import { HORAIRE_LIGNE_MAX, HORAIRES_LIGNES_MAX, PRESENTATION_MAX, type ChampVitrine, type VitrineSaisie } from "@/lib/vitrine";

const initial: EtatVitrine = { statut: "initial" };

/** Profil de la vitrine d'un pro, prérempli avec ce qui est enregistré. */
export function VitrineForm({ valeurs }: { valeurs: VitrineSaisie }) {
  const [etat, envoyer, enCours] = useActionState(modifierVitrine, initial);
  const resume = useRef<HTMLDivElement>(null);

  const erreurs = etat.statut === "erreurs" ? etat.erreurs : {};
  const saisie = etat.statut === "erreurs" ? etat.saisie : valeurs;
  const general = etat.statut === "erreurs" ? etat.general : undefined;
  const nombreErreurs = Object.keys(erreurs).length;

  // Après un envoi refusé, on amène le lecteur sur le résumé des erreurs
  useEffect(() => {
    if (etat.statut === "erreurs") resume.current?.focus();
  }, [etat]);

  const champ = (nom: ChampVitrine) => ({
    "aria-invalid": erreurs[nom] ? true : undefined,
    "aria-describedby": erreurs[nom] ? `erreur-${nom}` : undefined,
  });
  const erreur = (nom: ChampVitrine) =>
    erreurs[nom] && (
      <span className="erreur" id={`erreur-${nom}`}>
        {erreurs[nom]}
      </span>
    );

  return (
    <form className="formulaire" action={envoyer} noValidate>
      {(nombreErreurs > 0 || general) && (
        <div className="avis avis-erreur" ref={resume} tabIndex={-1} role="alert">
          <strong>
            {general ?? `${nombreErreurs > 1 ? `${nombreErreurs} champs sont à corriger` : "Un champ est à corriger"} avant d'enregistrer.`}
          </strong>
        </div>
      )}

      <div className="champ">
        <label htmlFor="secteur">Secteur</label>
        <select id="secteur" name="secteur" defaultValue={saisie.secteur} {...champ("secteur")}>
          <option value="" disabled>
            Choisir
          </option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nom}
            </option>
          ))}
        </select>
        <span className="small muted">Votre vitrine est mise en avant dans cette catégorie.</span>
        {erreur("secteur")}
      </div>

      <div className="champ-ligne">
        <div className="champ">
          <label htmlFor="ile">Île</label>
          <select id="ile" name="ile" defaultValue={saisie.ile} {...champ("ile")}>
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
          <input id="commune" name="commune" type="text" defaultValue={saisie.commune} autoComplete="address-level2" {...champ("commune")} />
          {erreur("commune")}
        </div>
      </div>

      <div className="champ">
        <label htmlFor="presentation">Présentation de l&apos;entreprise</label>
        <textarea
          id="presentation"
          name="presentation"
          maxLength={PRESENTATION_MAX}
          defaultValue={saisie.presentation}
          placeholder="Ce que vous faites, depuis quand, où vous intervenez…"
          {...champ("presentation")}
        />
        <span className="small muted">{PRESENTATION_MAX} caractères au plus, sans adresse e-mail.</span>
        {erreur("presentation")}
      </div>

      <div className="champ">
        <label htmlFor="horaires">Horaires</label>
        <textarea
          id="horaires"
          name="horaires"
          rows={4}
          defaultValue={saisie.horaires}
          placeholder={"Lundi au vendredi : 7 h 30 – 16 h\nSamedi : 8 h – 12 h"}
          {...champ("horaires")}
        />
        <span className="small muted">
          Une plage par ligne, {HORAIRES_LIGNES_MAX} lignes de {HORAIRE_LIGNE_MAX} caractères au plus.
        </span>
        {erreur("horaires")}
      </div>

      <button className="btn btn-primary" type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer ma vitrine"}
      </button>
    </form>
  );
}
