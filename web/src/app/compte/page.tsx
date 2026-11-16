import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountListingRow } from "@/components/AccountListingRow";
import { Icon } from "@/components/Icon";
import { getAccountListings, getVitrine, maximumAnnonces, peutPublier, resumer } from "@/lib/accounts";
import { prixXpf } from "@/lib/format";
import { getSession } from "@/lib/session";

// Espace privé : la page attend la session côté serveur, sans chercher la navigation instantanée
export const instant = false;

export default async function DashboardPage() {
  const compte = await getSession();
  if (!compte) redirect("/connexion");

  const annonces = getAccountListings(compte);
  const resume = resumer(annonces);
  const vitrine = getVitrine(compte);

  return (
    <>
      <div className="fiche-titre">
        <h1>Bonjour {compte.nom}</h1>
        <p className="muted">Voici où en sont vos annonces.</p>
      </div>

      <dl className="chiffres">
        <div>
          <dt>Annonces actives</dt>
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
      <p className="small muted">Chiffres d&apos;exemple : les vues et les contacts ne sont pas encore comptés.</p>

      {vitrine && (
        <div className="carte">
          <div className="section-head">
            <h2>Ma vitrine</h2>
            <span className="suivi-badges">
              <span className="badge badge-statut statut-active">Vitrine active</span>
              {vitrine.verifie && (
                <span className="badge badge-pro">
                  <Icon name="verifie" />
                  Pro vérifié
                </span>
              )}
            </span>
          </div>
          <p className="muted">
            {vitrine.pro.secteur} · {vitrine.pro.commune}, {vitrine.pro.ile}. Abonnement à {prixXpf(10000)} par mois.
          </p>
          <Link className="btn btn-secondary" href={`/pros/${vitrine.pro.slug}`}>
            Voir ma vitrine publique
          </Link>
        </div>
      )}

      <div className="stack">
        <div className="section-head">
          <h2>Dernières annonces</h2>
          <Link className="link" href="/compte/annonces">
            Toutes mes annonces
          </Link>
        </div>
        <ul className="suivis">
          {annonces.slice(0, 3).map((annonce) => (
            <AccountListingRow key={annonce.id} annonce={annonce} />
          ))}
        </ul>
      </div>

      {compte.type === "particulier" &&
        (peutPublier(compte, annonces) ? (
          <Link className="btn btn-primary bouton-seul" href="/publier">
            Publier une annonce
          </Link>
        ) : (
          <div className="avis">
            <p>
              Vous avez atteint le maximum de {maximumAnnonces(compte)} annonces actives. Retirez-en une pour en publier
              une nouvelle.
            </p>
          </div>
        ))}
    </>
  );
}
