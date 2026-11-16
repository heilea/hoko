"use client";

import { useActionState } from "react";
import { changerMotDePasse, type EtatNouveauMotDePasse } from "@/app/actions";
import { MOT_DE_PASSE_MIN } from "@/lib/inscription";

const initial: EtatNouveauMotDePasse = {};

export function NewPasswordForm() {
  const [etat, envoyer, enCours] = useActionState(changerMotDePasse, initial);
  const erreurs = etat.erreurs ?? {};

  const champ = (nom: "motDePasse" | "confirmation") => ({
    "aria-invalid": erreurs[nom] ? true : undefined,
    "aria-describedby": erreurs[nom] ? `erreur-${nom}` : undefined,
  });

  return (
    <form className="formulaire" action={envoyer} noValidate>
      {etat.general && (
        <div className="avis avis-erreur" role="alert">
          <strong>{etat.general}</strong>
        </div>
      )}
      <div className="champ">
        <label htmlFor="motDePasse">Nouveau mot de passe</label>
        <span className="small muted">{MOT_DE_PASSE_MIN} caractères au moins.</span>
        <input id="motDePasse" name="motDePasse" type="password" autoComplete="new-password" {...champ("motDePasse")} />
        {erreurs.motDePasse && (
          <span className="erreur" id="erreur-motDePasse">
            {erreurs.motDePasse}
          </span>
        )}
      </div>
      <div className="champ">
        <label htmlFor="confirmation">Confirmer le mot de passe</label>
        <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" {...champ("confirmation")} />
        {erreurs.confirmation && (
          <span className="erreur" id="erreur-confirmation">
            {erreurs.confirmation}
          </span>
        )}
      </div>
      <button className="btn btn-primary" type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}
