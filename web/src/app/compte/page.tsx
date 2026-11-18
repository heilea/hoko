import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountListingRow } from "@/components/AccountListingRow";
import { Icon } from "@/components/Icon";
import { LIBELLE_VITRINE, maximumAnnonces, peutPublier, resumer } from "@/lib/accounts";
import { getAccountListings, getVitrine } from "@/lib/compte-donnees";
import { prixXpf } from "@/lib/format";
import { getSession } from "@/lib/session";

// Espace privé : la page attend la session côté serveur, sans chercher la navigation instantanée
export const instant = false;

export default async function DashboardPage() {
  const compte = await getSession();
  if (!compte) redirect("/connexion");

  const [annonces, vitrine] = await Promise.all([getAccountListings(compte), getVitrine(compte)]);
  const resume = resumer(annonces);
  const enLigne = vitrine?.statut === "actif" && vitrine.verifie;

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
          <dd>{resume.contacts}</dd>
        </div>
      </dl>
      <p className="small muted">Les vues et les contacts ne sont pas encore comptés.</p>

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
          {!vitrine.verifie && <p className="small">Hoko contrôle votre numéro TAHITI avant d&apos;afficher le badge « Pro vérifié ».</p>}
          {vitrine.statut === "en_attente_paiement" && (
            <p className="small">Votre vitrine sera visible dès réception du paiement de l&apos;abonnement.</p>
          )}
          {enLigne && (
            <Link className="btn btn-secondary" href={`/pros/${vitrine.slug}`}>
              Voir ma vitrine publique
            </Link>
          )}
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
              <AccountListingRow key={annonce.id} annonce={annonce} gestes={compte.type === "particulier"} />
            ))}
          </ul>
        ) : (
          <p className="muted">Vous n&apos;avez pas encore d&apos;annonce.</p>
        )}
      </div>

      {compte.type === "particulier" &&
        (peutPublier(compte, annonces) ? (
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
        ))}
    </>
  );
}
