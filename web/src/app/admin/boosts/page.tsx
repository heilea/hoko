import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deciderBoost } from "@/app/boost-actions";
import { getBoostsAdmin } from "@/lib/admin-donnees";
import { BOOST_JOURS, CONFIRMATION_BOOST, LIBELLE_GESTE_BOOST, lireGesteBoost, numeroCommande } from "@/lib/boost";
import { prixXpf } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Boosts" };

export const instant = false;

/**
 * Boosts : commandes en attente de paiement (à activer à réception des fonds, ou à annuler),
 * puis boosts actifs.
 */
export default async function AdminBoostsPage({ searchParams }: PageProps<"/admin/boosts">) {
  // Chaque page vérifie le rôle elle-même, sans compter seulement sur la mise en page
  const compte = await getSession();
  if (!compte?.admin) notFound();

  const boosts = await getBoostsAdmin();
  const enAttente = boosts.filter((b) => b.statut === "en_attente_paiement");
  const actifs = boosts.filter((b) => b.statut === "actif");

  return (
    <>
      <div className="section-head">
        <h1>Boosts</h1>
        <span className="muted">
          {enAttente.length} en attente de paiement, {actifs.length} actif{actifs.length > 1 ? "s" : ""}
        </span>
      </div>

      <Suspense fallback={null}>
        <Message searchParams={searchParams} />
      </Suspense>

      <div className="avis">
        <p className="small">
          Contactez le particulier pour le paiement (virement ou espèces, numéro de commande en référence). Activez à réception des
          fonds : les {BOOST_JOURS} jours commencent à ce moment. Une commande non payée bloque une place de la catégorie :
          annulez-la si le paiement ne vient pas.
        </p>
      </div>

      <h2>En attente de paiement</h2>
      {enAttente.length === 0 ? (
        <p className="muted">Aucune commande en attente.</p>
      ) : (
        <ul className="moderation">
          {enAttente.map((boost) => (
            <li key={boost.id} className="carte moderation-carte">
              <div className="moderation-tete">
                <h3>
                  {numeroCommande(boost.id)} · {prixXpf(boost.montantXpf)}
                </h3>
                <span className="badge badge-attente">En attente de paiement</span>
              </div>
              <dl className="details details-nus small">
                <dt>Annonce</dt>
                <dd>
                  {boost.titre} ({boost.categorie}){boost.annonceEnLigne ? "" : " : plus en ligne"}
                </dd>
                <dt>Particulier</dt>
                <dd>{boost.vendeur}</dd>
                <dt>Téléphone</dt>
                <dd>{boost.telephone}</dd>
                <dt>E-mail du compte</dt>
                <dd>
                  <a className="link" href={`mailto:${boost.email}?subject=${encodeURIComponent(`Boost ${numeroCommande(boost.id)}`)}`}>
                    {boost.email}
                  </a>
                </dd>
                <dt>Commandé le</dt>
                <dd>{boost.commandeLe}</dd>
              </dl>
              <div className="suivi-actions">
                {boost.annonceEnLigne && (
                  <Link className="link" href={`/annonces/${boost.annonceId}`}>
                    Voir l&apos;annonce
                  </Link>
                )}
                <form action={deciderBoost} className="boutons">
                  <input type="hidden" name="id" value={boost.id} />
                  {boost.annonceEnLigne && (
                    <button className="btn btn-petit btn-primary" type="submit" name="geste" value="activer">
                      {LIBELLE_GESTE_BOOST.activer}
                    </button>
                  )}
                  <button className="btn btn-petit btn-secondary" type="submit" name="geste" value="annuler">
                    {LIBELLE_GESTE_BOOST.annuler}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2>Actifs</h2>
      {actifs.length === 0 ? (
        <p className="muted">Aucun boost actif.</p>
      ) : (
        <ul className="small">
          {actifs.map((boost) => (
            <li key={boost.id}>
              {numeroCommande(boost.id)} · <Link className="link" href={`/annonces/${boost.annonceId}`}>{boost.titre}</Link> (
              {boost.categorie}) · jusqu&apos;au {boost.finLe}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function Message({ searchParams }: Pick<PageProps<"/admin/boosts">, "searchParams">) {
  const { fait, erreur } = await searchParams;
  if (erreur) {
    return (
      <div className="avis avis-erreur" role="alert">
        <p>
          <strong>
            {erreur === "pas_en_ligne"
              ? "L'annonce n'est plus en ligne : le boost ne peut pas être activé. Annulez la commande."
              : "La décision n'a pas pu être enregistrée. Rechargez la page et réessayez."}
          </strong>
        </p>
      </div>
    );
  }
  const geste = lireGesteBoost(fait);
  if (!geste) return null;
  return (
    <div className="avis" role="status">
      <p>
        <strong>{CONFIRMATION_BOOST[geste]}</strong>
      </p>
    </div>
  );
}
