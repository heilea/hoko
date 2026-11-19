import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountListingRow } from "@/components/AccountListingRow";
import { Icon } from "@/components/Icon";
import { LIBELLE_VITRINE, maximumAnnonces, peutPublier, resumer } from "@/lib/accounts";
import { getAccountListings, getVitrine } from "@/lib/compte-donnees";
import { prixXpf } from "@/lib/format";
import { getSession } from "@/lib/session";
import { etapesVitrine, vitrineEnLigne } from "@/lib/vitrine";

// Espace privé : la page attend la session côté serveur, sans chercher la navigation instantanée
export const instant = false;

export default async function DashboardPage() {
  const compte = await getSession();
  if (!compte) redirect("/connexion");

  const [annonces, vitrine] = await Promise.all([getAccountListings(compte), getVitrine(compte)]);
  const resume = resumer(annonces);
  const enLigne = vitrine ? vitrineEnLigne(vitrine) : false;

  return (
    <>
      <div className="fiche-titre">
        <h1>Bonjour {compte.nom}</h1>
        <p className="muted">Voici où en sont vos annonces.</p>
      </div>

      <dl className="chiffres">
        <div>
          <dt>Annonces en ligne</dt>
          <dd>
            {resume.actives}
            <span className="suffixe"> sur {maximumAnnonces(compte)}</span>
          </dd>
        </div>
        <div>
          <dt>Vues</dt>
          <dd>{resume.vues}</dd>
        </div>
        <div>
          <dt>Contacts reçus</dt>
          <dd>{resume.contacts + (vitrine?.contacts ?? 0)}</dd>
        </div>
      </dl>
      <p className="small muted">
        Un contact = un clic sur « Voir le numéro »{vitrine ? ", sur vos annonces et sur votre vitrine" : ""}. Les vues ne sont pas
        encore comptées.
      </p>

      {vitrine && (
        <div className="carte">
          <div className="section-head">
            <h2>Ma vitrine</h2>
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
          <p className="muted">
            {vitrine.secteur} · {vitrine.commune}, {vitrine.ile}. Abonnement à {prixXpf(10000)} par mois.
          </p>
          {!enLigne && (
            <ul className="small">
              {etapesVitrine(vitrine).map((etape) => (
                <li key={etape}>{etape}</li>
              ))}
            </ul>
          )}
          <div className="boutons">
            <Link className="btn btn-secondary" href="/compte/vitrine">
              Modifier ma vitrine
            </Link>
            {enLigne && (
              <Link className="btn btn-secondary" href={`/pros/${vitrine.slug}`}>
                Voir ma vitrine publique
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="stack">
        <div className="section-head">
          <h2>Dernières annonces</h2>
          {annonces.length > 0 && (
            <Link className="link" href="/compte/annonces">
              Toutes mes annonces
            </Link>
          )}
        </div>
        {annonces.length > 0 ? (
          <ul className="suivis">
            {annonces.slice(0, 3).map((annonce) => (
              <AccountListingRow key={annonce.id} annonce={annonce} vitrine={vitrine ? { enLigne } : undefined} />
            ))}
          </ul>
        ) : (
          <p className="muted">Vous n&apos;avez pas encore d&apos;annonce.</p>
        )}
      </div>

      {peutPublier(compte, annonces) ? (
          <Link className="btn btn-primary bouton-seul" href="/publier">
            Publier une annonce
          </Link>
        ) : (
          <div className="avis">
            <p>
              Vous avez atteint le maximum de {maximumAnnonces(compte)} annonces en ligne. Marquez-en une vendue ou
              retirez-la pour en publier une nouvelle.
            </p>
          </div>
        )}
    </>
  );
}
