"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { sInscrire, type EtatInscription } from "@/app/actions";
import { PiegeRobots } from "@/components/PiegeRobots";
import { categories } from "@/lib/data";
import { prixXpf } from "@/lib/format";
import { MOT_DE_PASSE_MIN, NOM_MAX, NUMERO_TAHITI_MAX, type ChampInscription, type TypeCompte } from "@/lib/inscription";
import { ILES } from "@/lib/validation";

const initial: EtatInscription = { statut: "initial" };

/** Formulaire d'inscription d'un annonceur, particulier ou professionnel. */
export function SignupForm() {
  const [etat, envoyer, enCours] = useActionState(sInscrire, initial);
  const [type, setType] = useState<TypeCompte>("particulier");
  const resume = useRef<HTMLDivElement>(null);

  const erreurs = etat.statut === "erreurs" ? etat.erreurs : {};
  const saisie = etat.statut === "erreurs" ? etat.saisie : undefined;
  const nombreErreurs = Object.keys(erreurs).length;
  const general = etat.statut === "erreurs" ? etat.general : undefined;
  const pro = type === "pro";

  // Après un envoi refusé, on amène le lecteur sur le résumé des erreurs
  useEffect(() => {
    if (etat.statut === "erreurs") resume.current?.focus();
  }, [etat]);

  if (etat.statut === "envoye") {
    return (
      <div className="stack" role="status">
        <div className="avis">
          <p>
            <strong>Vérifiez votre boîte mail.</strong>
          </p>
          <p>
            Si aucun compte n&apos;existe déjà pour <strong>{etat.email}</strong>, un lien de confirmation vient d&apos;y être
            envoyé. Cliquez dessus pour activer votre compte, puis connectez-vous.
          </p>
          <p className="small">Rien reçu après quelques minutes ? Regardez dans les courriers indésirables.</p>
        </div>
        {pro && (
          <div className="avis">
            <p>
              <strong>La suite pour un professionnel</strong>
            </p>
            <p className="small">
              Hoko contrôle votre numéro TAHITI avant d&apos;afficher le badge « Pro vérifié ». Votre vitrine reste en attente
              de paiement jusqu&apos;à réception de l&apos;abonnement de {prixXpf(10000)} par mois.
            </p>
          </div>
        )}
        <Link className="btn btn-secondary" href="/connexion">
          Aller à la connexion
        </Link>
      </div>
    );
  }

  const champ = (nom: ChampInscription) => ({
    "aria-invalid": erreurs[nom] ? true : undefined,
    "aria-describedby": erreurs[nom] ? `erreur-${nom}` : undefined,
  });
  const erreur = (nom: ChampInscription) =>
    erreurs[nom] && (
      <span className="erreur" id={`erreur-${nom}`}>
        {erreurs[nom]}
      </span>
    );

  return (
    <form
      className="formulaire"
      action={envoyer}
      noValidate
      // Envoi à la main : après un envoi par `action`, React remet le formulaire à zéro et le
      // type de compte coché ne correspondrait plus aux champs affichés.
      onSubmit={(event) => {
        event.preventDefault();
        const donnees = new FormData(event.currentTarget);
        startTransition(() => envoyer(donnees));
      }}
    >
      {(nombreErreurs > 0 || general) && (
        <div className="avis avis-erreur" ref={resume} tabIndex={-1} role="alert">
          <strong>
            {general ??
              `${nombreErreurs > 1 ? `${nombreErreurs} champs sont à corriger` : "Un champ est à corriger"} avant de créer le compte.`}
          </strong>
        </div>
      )}

      <fieldset className="champ choix">
        <legend>Type de compte</legend>
        <div className="options">
          <label className="option" htmlFor="type-particulier">
            <input id="type-particulier" name="type" type="radio" value="particulier" checked={!pro} onChange={() => setType("particulier")} />
            <span>
              <strong>Particulier</strong>
              <span className="small muted">Annonces gratuites</span>
            </span>
          </label>
          <label className="option" htmlFor="type-pro">
            <input id="type-pro" name="type" type="radio" value="pro" checked={pro} onChange={() => setType("pro")} />
            <span>
              <strong>Professionnel</strong>
              <span className="small muted">Vitrine, {prixXpf(10000)} par mois</span>
            </span>
          </label>
        </div>
        {erreur("type")}
      </fieldset>

      <div className="champ">
        <label htmlFor="nom">{pro ? "Nom de l'entreprise" : "Prénom"}</label>
        <input id="nom" name="nom" type="text" maxLength={NOM_MAX} defaultValue={saisie?.nom} autoComplete={pro ? "organization" : "given-name"} {...champ("nom")} />
        {erreur("nom")}
      </div>

      <div className="champ">
        <label htmlFor="email">E-mail</label>
        <span className="small muted">Il sert à vous connecter et n&apos;est jamais affiché.</span>
        <input id="email" name="email" type="email" inputMode="email" defaultValue={saisie?.email} autoComplete="email" {...champ("email")} />
        {erreur("email")}
      </div>

      <div className="champ">
        <label htmlFor="telephone">Téléphone</label>
        <span className="small muted">Les acheteurs vous joignent à ce numéro, au clic sur « Voir le numéro ».</span>
        <input id="telephone" name="telephone" type="tel" inputMode="tel" defaultValue={saisie?.telephone} placeholder="87 12 34 56" autoComplete="tel" {...champ("telephone")} />
        {erreur("telephone")}
      </div>

      {pro && (
        <>
          <div className="champ">
            <label htmlFor="numeroTahiti">Numéro TAHITI</label>
            <span className="small muted">Hoko le contrôle avant d&apos;afficher le badge « Pro vérifié ».</span>
            <input id="numeroTahiti" name="numeroTahiti" type="text" maxLength={NUMERO_TAHITI_MAX} defaultValue={saisie?.numeroTahiti} autoComplete="off" {...champ("numeroTahiti")} />
            {erreur("numeroTahiti")}
          </div>

          <div className="champ">
            <label htmlFor="secteur">Secteur</label>
            <select id="secteur" name="secteur" defaultValue={saisie?.secteur ?? ""} {...champ("secteur")}>
              <option value="" disabled>
                Choisir
              </option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nom}
                </option>
              ))}
            </select>
            {erreur("secteur")}
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
        </>
      )}

      <div className="champ">
        <label htmlFor="motDePasse">Mot de passe</label>
        <span className="small muted">{MOT_DE_PASSE_MIN} caractères au moins.</span>
        <input id="motDePasse" name="motDePasse" type="password" autoComplete="new-password" {...champ("motDePasse")} />
        {erreur("motDePasse")}
      </div>

      <div className="champ">
        <label htmlFor="confirmation">Confirmer le mot de passe</label>
        <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" {...champ("confirmation")} />
        {erreur("confirmation")}
      </div>

      <button className="btn btn-primary" type="submit" disabled={enCours}>
        {enCours ? "Vérification…" : "Créer mon compte"}
      </button>
      <PiegeRobots />
    </form>
  );
}
