"use client";

import { useState, useTransition } from "react";
import { revealPhone, type CibleContact } from "@/app/actions";
import { Icon } from "./Icon";

type Etat = { numero: string } | { erreur: "limite" | "autre" } | null;

/**
 * Bouton « Voir le numéro » : le numéro n'est demandé au serveur qu'au clic.
 * Sert sur une annonce (numéro du vendeur) et sur une vitrine (numéro du pro).
 */
export function RevealPhone({ cible, nom }: { cible: CibleContact; nom: string }) {
  const [etat, setEtat] = useState<Etat>(null);
  const [enCours, startTransition] = useTransition();
  const pro = cible.type === "pro";

  function demander() {
    startTransition(async () => {
      try {
        const reponse = await revealPhone(cible);
        setEtat("numero" in reponse ? { numero: reponse.numero } : { erreur: reponse.erreur === "limite" ? "limite" : "autre" });
      } catch {
        setEtat({ erreur: "autre" });
      }
    });
  }

  if (etat && "numero" in etat) {
    // Indicatif de la Polynésie française : +689
    const lien = `tel:+689${etat.numero.replace(/\s/g, "")}`;
    return (
      <div className="contact">
        <span className="small muted">Numéro de {nom}</span>
        <a className="numero" href={lien}>
          <Icon name="telephone" />
          {etat.numero}
        </a>
        {!pro && <p className="small avis">Ne payez jamais avant d&apos;avoir vu l&apos;article.</p>}
      </div>
    );
  }

  return (
    <div className="contact">
      <button className="btn btn-primary btn-block" type="button" onClick={demander} disabled={enCours}>
        <Icon name="telephone" />
        {enCours ? "Chargement…" : "Voir le numéro"}
      </button>
      {etat && "erreur" in etat ? (
        <p className="small avis" role="alert">
          {etat.erreur === "limite"
            ? "Vous avez affiché beaucoup de numéros. Réessayez dans une heure."
            : "Le numéro n'a pas pu être affiché. Réessayez dans un instant."}
        </p>
      ) : (
        <p className="small muted">Appelez ou écrivez directement à {nom}. Aucun compte nécessaire.</p>
      )}
    </div>
  );
}
