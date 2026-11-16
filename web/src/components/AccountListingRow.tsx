import Link from "next/link";
import { LIBELLE_BOOST, LIBELLE_STATUT, type AccountListing } from "@/lib/accounts";
import { getCategory } from "@/lib/data";
import { prixXpf } from "@/lib/format";
import { Icon } from "./Icon";

/** Une annonce dans l'espace de son propriétaire : statut, chiffres et lien vers la page publique. */
export function AccountListingRow({ annonce }: { annonce: AccountListing }) {
  const categorie = getCategory(annonce.categorie);
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
          <strong>Motif du refus :</strong> {annonce.motif}
        </p>
      )}
      {annonce.lien ? (
        <Link className="link suivi-lien" href={annonce.lien}>
          Voir l&apos;annonce <Icon name="fleche" />
        </Link>
      ) : (
        <span className="small muted suivi-lien">Pas encore en ligne</span>
      )}
    </li>
  );
}
