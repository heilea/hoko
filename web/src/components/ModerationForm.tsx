"use client";

import { useActionState } from "react";
import { modererAnnonce, type EtatModeration } from "@/app/actions";
import { MOTIF_MAX } from "@/lib/moderation";

const initial: EtatModeration = {};

/** Boutons « Valider » et « Refuser » d'une annonce en attente, avec le motif d'un refus. */
export function ModerationForm({ id }: { id: number }) {
  const [etat, envoyer, enCours] = useActionState(modererAnnonce, initial);
  const champMotif = `motif-${id}`;

  return (
    <form className="formulaire moderation-form" action={envoyer} noValidate>
      <input type="hidden" name="id" value={id} />
      {etat.erreur && (
        <div className="avis avis-erreur" role="alert">
          <strong>{etat.erreur}</strong>
        </div>
      )}
      <div className="champ">
        <label htmlFor={champMotif}>Motif, obligatoire pour refuser</label>
        <span className="small muted">L&apos;annonceur le lira dans « Mes annonces ».</span>
        <textarea id={champMotif} name="motif" maxLength={MOTIF_MAX} defaultValue={etat.motif} rows={2} />
      </div>
      <div className="boutons">
        <button className="btn btn-primary" type="submit" name="decision" value="active" disabled={enCours}>
          Valider
        </button>
        <button className="btn btn-secondary" type="submit" name="decision" value="refusee" disabled={enCours}>
          Refuser
        </button>
      </div>
    </form>
  );
}
