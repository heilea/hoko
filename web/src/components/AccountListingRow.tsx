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
 * possibles (marquer vendue, modifier, retirer, republier). `gestes` : faux pour un pro, dont
 * les annonces se gèrent depuis la vitrine.
 */
export function AccountListingRow({ annonce, gestes = true }: { annonce: AccountListing; gestes?: boolean }) {
  const categorie = getCategory(annonce.categorie);
  const phrase = etat(annonce);
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
        {annonce.lien && (
          <Link className="link" href={annonce.lien}>
            Voir l&apos;annonce <Icon name="fleche" />
          </Link>
        )}
        {gestes && annonce.gestes.length > 0 && (
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
                  {LIBELLE_GESTE[geste]}
                </button>
              ),
            )}
          </form>
        )}
      </div>
    </li>
  );
}
