import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deciderVitrine } from "@/app/actions";
import { Icon } from "@/components/Icon";
import { dateCourte, LIBELLE_VITRINE } from "@/lib/accounts";
import { getVitrinesAdmin } from "@/lib/admin-donnees";
import { getSession } from "@/lib/session";
import { CONFIRMATION_VITRINE, gestesVitrine, LIBELLE_GESTE_VITRINE, lireGesteVitrine, vitrineEnLigne } from "@/lib/vitrine";

export const metadata: Metadata = { title: "Vitrines" };

export const instant = false;

/**
 * Vitrines des pros : contrôle de l'entreprise (badge « Pro vérifié » après réception des
 * documents de la DICP), activation à réception de l'abonnement, suspension.
 */
export default async function AdminVitrinesPage({ searchParams }: PageProps<"/admin/vitrines">) {
  // Chaque page vérifie le rôle elle-même, sans compter seulement sur la mise en page
  const compte = await getSession();
  if (!compte?.admin) notFound();

  const vitrines = await getVitrinesAdmin();
  const enAttente = vitrines.filter((v) => !vitrineEnLigne(v)).length;

  return (
    <>
      <div className="section-head">
        <h1>Vitrines</h1>
        <span className="muted">
          {vitrines.length} au total, {enAttente} pas encore en ligne
        </span>
      </div>

      <Suspense fallback={null}>
        <Message searchParams={searchParams} />
      </Suspense>

      <div className="avis">
        <p className="small">
          Une vitrine est en ligne quand elle est <strong>active</strong> (abonnement reçu) <strong>et</strong> vérifiée (documents de
          la DICP reçus par e-mail et numéro TAHITI contrôlé). Écrivez au pro à l&apos;adresse indiquée pour demander les documents.
        </p>
      </div>

      {vitrines.length === 0 ? (
        <div className="empty">
          <p>
            <strong>Aucune vitrine pour le moment.</strong>
          </p>
          <p className="muted">Elles apparaissent ici dès l&apos;inscription d&apos;un pro.</p>
        </div>
      ) : (
        <ul className="moderation">
          {vitrines.map((vitrine) => (
            <li key={vitrine.id} className="carte moderation-carte">
              <div className="moderation-tete">
                <h2>{vitrine.nom}</h2>
                <span className="suivi-badges">
                  <span className={`badge ${vitrine.statut === "actif" ? "badge-statut statut-active" : "badge-attente"}`}>
                    {LIBELLE_VITRINE[vitrine.statut]}
                  </span>
                  {vitrine.verifie && (
                    <span className="badge badge-pro">
                      <Icon name="verifie" />
                      Pro vérifié
                    </span>
                  )}
                </span>
              </div>
              <dl className="details details-nus small">
                <dt>Secteur</dt>
                <dd>
                  {vitrine.secteur} · {vitrine.lieu}
                </dd>
                <dt>Numéro TAHITI</dt>
                <dd>{vitrine.numeroTahiti}</dd>
                <dt>E-mail du compte</dt>
                <dd>
                  <a className="link" href={`mailto:${vitrine.email}`}>
                    {vitrine.email}
                  </a>
                </dd>
                <dt>Téléphone</dt>
                <dd>{vitrine.telephone}</dd>
                <dt>Annonces en ligne</dt>
                <dd>{vitrine.annoncesEnLigne}</dd>
                <dt>Inscrit le</dt>
                <dd>{dateCourte(vitrine.creeeLe)}</dd>
              </dl>
              <div className="suivi-actions">
                {vitrineEnLigne(vitrine) && (
                  <Link className="link" href={`/pros/${vitrine.slug}`}>
                    Voir la vitrine <Icon name="fleche" />
                  </Link>
                )}
                <form action={deciderVitrine} className="boutons">
                  <input type="hidden" name="id" value={vitrine.id} />
                  {gestesVitrine(vitrine).map((geste, rang) => (
                    <button
                      key={geste}
                      className={`btn btn-petit ${rang === 0 && geste !== "retirer_badge" ? "btn-primary" : "btn-secondary"}`}
                      type="submit"
                      name="geste"
                      value={geste}
                    >
                      {LIBELLE_GESTE_VITRINE[geste]}
                    </button>
                  ))}
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function Message({ searchParams }: Pick<PageProps<"/admin/vitrines">, "searchParams">) {
  const { fait, erreur } = await searchParams;
  if (erreur) {
    return (
      <div className="avis avis-erreur" role="alert">
        <p>
          <strong>La décision n&apos;a pas pu être enregistrée. Rechargez la page et réessayez.</strong>
        </p>
      </div>
    );
  }
  const geste = lireGesteVitrine(fait);
  if (!geste) return null;
  return (
    <div className="avis" role="status">
      <p>
        <strong>{CONFIRMATION_VITRINE[geste]}</strong>
      </p>
    </div>
  );
}
