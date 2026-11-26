"use client";

import { useActionState } from "react";
import { traiterSignalements, type EtatTraitement } from "@/app/signalement-actions";

const initial: EtatTraitement = {};

/** « Retirer l'annonce » (avec motif pour l'annonceur) ou « Classer sans suite ». */
export function SignalementForm({ id, enLigne }: { id: number; enLigne: boolean }) {
  const [etat, envoyer, enCours] = useActionState(traiterSignalements, initial);
  const champMotif = `motif-signalement-${id}`;

  return (
    <form className="formulaire moderation-form" action={envoyer} noValidate>
      <input type="hidden" name="id" value={id} />
      {etat.erreur && (
        <div className="avis avis-erreur" role="alert">
          <strong>{etat.erreur}</strong>
        </div>
      )}
      {enLigne && (
        <div className="champ">
          <label htmlFor={champMotif}>Motif, obligatoire pour retirer</label>
          <span className="small muted">L&apos;annonceur le lira dans « Mes annonces ».</span>
          <textarea id={champMotif} name="motif" maxLength={500} defaultValue={etat.motif} rows={2} />
        </div>
      )}
      <div className="boutons">
        {enLigne && (
          <button className="btn btn-primary" type="submit" name="geste" value="retirer" disabled={enCours}>
            Retirer l&apos;annonce
          </button>
        )}
        <button className="btn btn-secondary" type="submit" name="geste" value="classer" disabled={enCours}>
          Classer sans suite
        </button>
      </div>
    </form>
  );
}
