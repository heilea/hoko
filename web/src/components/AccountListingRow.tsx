import Link from "next/link";
import { gererAnnonce } from "@/app/actions";
import { LIBELLE_BOOST, LIBELLE_GESTE, LIBELLE_STATUT, type AccountListing } from "@/lib/accounts";
import { getCategory } from "@/lib/data";
import { prixXpf } from "@/lib/format";
import { Icon } from "./Icon";

/** Phrase courte qui dit où en est l'annonce, sous son titre. */
function etat(annonce: AccountListing): string | null {
  switch (annonce.statut) {
    case "active":
      return annonce.finLe ? `En ligne jusqu'au ${annonce.finLe}` : "En ligne";
    case "expiree":
      return `Expirée le ${annonce.finLe ?? "—"} : republiez-la pour 30 jours de plus.`;
    case "en_attente_validation":
      return "Hoko la vérifie avant de la mettre en ligne.";
    case "vendue":
    case "retiree":
      return "Plus en ligne. Vous pouvez la republier.";
    default:
      return null;
  }
}

/**
 * Une annonce dans l'espace de son propriétaire : état, date de fin, chiffres, et les boutons
 * possibles (marquer vendue, modifier, retirer, republier).
 *
 * `vitrine` : pour une annonce de pro, dit si sa vitrine est en ligne. Hors ligne, une annonce
 * validée n'est pas encore visible du public : pas de lien vers sa page.
 */
export function AccountListingRow({ annonce, vitrine }: { annonce: AccountListing; vitrine?: { enLigne: boolean } }) {
  const categorie = getCategory(annonce.categorie);
  const cachee = vitrine && !vitrine.enLigne && annonce.statut === "active";
  const phrase = cachee ? "Validée : visible dès que votre vitrine sera en ligne." : etat(annonce);
  const lien = cachee ? undefined : annonce.lien;
  // Une annonce de vitrine n'a pas de durée : « Remettre en ligne » plutôt que « Republier 30 jours »
  const libelle = (geste: Exclude<typeof annonce.gestes[number], "modifier">) =>
    vitrine && geste === "republier" ? "Remettre en ligne" : LIBELLE_GESTE[geste];
  return (
    <li className="suivi">
      <div className="suivi-corps">
        <h3>{annonce.titre}</h3>
        <span className="price">{prixXpf(annonce.prixXpf)}</span>
        <span className="suivi-badges">
          <span className={`badge badge-statut statut-${annonce.statut}`}>{LIBELLE_STATUT[annonce.statut]}</span>
          {annonce.boost !== "aucun" && (
            <span className={`badge ${annonce.boost === "actif" ? "badge-boost" : "badge-attente"}`}>
              {LIBELLE_BOOST[annonce.boost]}
            </span>
          )}
        </span>
        {phrase && <span className="small muted">{phrase}</span>}
      </div>
      <dl className="suivi-chiffres small">
        <div>
          <dt>Catégorie</dt>
          <dd>{categorie?.nom ?? "Autre"}</dd>
        </div>
        <div>
          <dt>Vues</dt>
          <dd>{annonce.vues}</dd>
        </div>
        <div>
          <dt>Contacts reçus</dt>
          <dd>{annonce.contacts}</dd>
        </div>
      </dl>
      {annonce.motif && (
        <p className="small suivi-motif">
          <strong>Motif du refus :</strong> {annonce.motif} Corrigez l&apos;annonce puis renvoyez-la.
        </p>
      )}
      <div className="suivi-actions">
        {lien && (
          <Link className="link" href={lien}>
            Voir l&apos;annonce <Icon name="fleche" />
          </Link>
        )}
        {annonce.gestes.length > 0 && (
          <form action={gererAnnonce} className="boutons">
            <input type="hidden" name="id" value={annonce.id} />
            {annonce.gestes.map((geste, rang) =>
              geste === "modifier" ? (
                <Link key={geste} className="btn btn-secondary btn-petit" href={`/compte/annonces/${annonce.id}/modifier`}>
                  {LIBELLE_GESTE.modifier}
                </Link>
              ) : (
                <button
                  key={geste}
                  className={`btn btn-petit ${rang === 0 ? "btn-primary" : "btn-secondary"}`}
                  type="submit"
                  name="geste"
                  value={geste}
                >
                  {libelle(geste)}
                </button>
              ),
            )}
          </form>
        )}
      </div>
    </li>
  );
}
