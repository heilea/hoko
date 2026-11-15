"use client";

import { useActionState } from "react";
import { seConnecter, type EtatConnexion } from "@/app/actions";

const initial: EtatConnexion = {};

export function LoginForm() {
  const [etat, envoyer, enCours] = useActionState(seConnecter, initial);

  return (
    <form className="formulaire" action={envoyer} noValidate>
      {etat.erreur && (
        <div className="avis avis-erreur" role="alert">
          <strong>{etat.erreur}</strong>
        </div>
      )}
      <div className="champ">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" inputMode="email" autoComplete="username" defaultValue={etat.email} required />
      </div>
      <div className="champ">
        <label htmlFor="motDePasse">Mot de passe</label>
        <input id="motDePasse" name="motDePasse" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={enCours}>
        {enCours ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
