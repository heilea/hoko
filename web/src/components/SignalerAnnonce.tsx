"use client";

import { useState, useTransition } from "react";
import { signalerAnnonce } from "@/app/signalement-actions";
import { DETAILS_MAX, MOTIFS_SIGNALEMENT, verifierSignalement } from "@/lib/signalements";

/**
 * Lien discret « Signaler cette annonce » : ouvre un petit formulaire (motif + précision).
 * Sans compte. Le serveur vérifie tout et la base limite les envois (SPEC.md, section 4 septies).
 */
export function SignalerAnnonce({ annonceId }: { annonceId: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [details, setDetails] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [enCours, startTransition] = useTransition();

  if (envoye) {
    return (
      <p className="small avis" role="status">
        Merci, votre signalement a été envoyé. Hoko vérifiera cette annonce.
      </p>
    );
  }

  if (!ouvert) {
    return (
      <button className="lien-discret small" type="button" onClick={() => setOuvert(true)}>
        Signaler cette annonce
      </button>
    );
  }

  function envoyer(evenement: React.FormEvent) {
    evenement.preventDefault();
    const probleme = verifierSignalement(motif, details);
    if (probleme) {
      setErreur(probleme);
      return;
    }
    startTransition(async () => {
      try {
        const reponse = await signalerAnnonce(annonceId, motif, details);
        if ("ok" in reponse) setEnvoye(true);
        else setErreur(reponse.erreur);
      } catch {
        setErreur("Le signalement n'a pas pu être envoyé. Réessayez dans un instant.");
      }
    });
  }

  return (
    <form className="formulaire signaler" onSubmit={envoyer} noValidate>
      <fieldset className="choix">
        <legend>Pourquoi signaler cette annonce ?</legend>
        {MOTIFS_SIGNALEMENT.map((m) => (
          <label key={m.valeur} className="small">
            <input type="radio" name="motif" value={m.valeur} checked={motif === m.valeur} onChange={() => setMotif(m.valeur)} />{" "}
            {m.libelle}
          </label>
        ))}
      </fieldset>
      <div className="champ">
        <label htmlFor="signaler-details">Précision {motif === "autre" ? "(obligatoire)" : "(facultatif)"}</label>
        <textarea
          id="signaler-details"
          maxLength={DETAILS_MAX}
          rows={3}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <span className="small muted">Lue seulement par Hoko.</span>
      </div>
      {erreur && (
        <p className="small avis avis-erreur" role="alert">
          {erreur}
        </p>
      )}
      <div className="boutons">
        <button className="btn btn-secondary" type="submit" disabled={enCours}>
          {enCours ? "Envoi…" : "Envoyer"}
        </button>
        <button className="lien-discret small" type="button" onClick={() => setOuvert(false)} disabled={enCours}>
          Annuler
        </button>
      </div>
    </form>
  );
}
