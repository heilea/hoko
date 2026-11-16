"use client";

import { useActionState } from "react";
import { demanderNouveauMotDePasse, type EtatMotDePasseOublie } from "@/app/actions";

const initial: EtatMotDePasseOublie = { statut: "initial" };

export function ForgotPasswordForm() {
  const [etat, envoyer, enCours] = useActionState(demanderNouveauMotDePasse, initial);

  if (etat.statut === "envoye") {
    return (
      <div className="avis" role="status">
        <p>
          <strong>Vérifiez votre boîte mail.</strong>
        </p>
        <p>
          Si un compte existe pour <strong>{etat.email}</strong>, un lien vient d&apos;y être envoyé pour choisir un nouveau
          mot de passe. Il faut l&apos;ouvrir dans ce même navigateur.
        </p>
      </div>
    );
  }

  return (
    <form className="formulaire" action={envoyer} noValidate>
      {etat.erreur && (
        <div className="avis avis-erreur" role="alert">
          <strong>{etat.erreur}</strong>
        </div>
      )}
      <div className="champ">
        <label htmlFor="email">E-mail du compte</label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" defaultValue={etat.email} required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={enCours}>
        {enCours ? "Envoi…" : "Recevoir le lien"}
      </button>
    </form>
  );
}
