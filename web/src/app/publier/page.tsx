import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { PublishForm } from "@/components/PublishForm";
import { maximumAnnonces, peutPublier } from "@/lib/accounts";
import { getAccountListings } from "@/lib/compte-donnees";
import { MAX_ANNONCES_PARTICULIER } from "@/lib/data";
import { prixXpf } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Publier une annonce",
  description: "Déposez gratuitement votre petite annonce sur Hoko.",
};

export default function PublishPage() {
  return (
    <main>
      <section className="band">
        <div className="wrap stack">
          <nav className="fil small" aria-label="Fil d'Ariane">
            <Link href="/">Accueil</Link>
            <Icon name="chevron" />
            <span>Publier une annonce</span>
          </nav>

          <div className="fiche-titre">
            <h1>Publier une annonce</h1>
            <p className="muted">Gratuit pour les particuliers.</p>
          </div>

          <div className="cols">
            {/* Le formulaire dépend du compte connecté, connu seulement à la requête */}
            <Suspense
              fallback={
                <p className="muted" role="status">
                  Chargement…
                </p>
              }
            >
              <Depot />
            </Suspense>

            <aside className="achat" aria-label="Bon à savoir">
              <h2>Bon à savoir</h2>
              <dl className="infos infos-nues">
                <dt>
                  <Icon name="telephone" />
                  Contact par téléphone
                </dt>
                <dd>
                  <span>Les acheteurs vous appellent directement. Votre numéro apparaît seulement au clic.</span>
                </dd>
                <dt>
                  <Icon name="gratuit" />
                  {MAX_ANNONCES_PARTICULIER} annonces actives au plus
                </dt>
                <dd>
                  <span>Pour en publier une nouvelle au-delà, retirez-en une.</span>
                </dd>
                <dt>
                  <Icon name="boost" />
                  Boost
                </dt>
                <dd>
                  <span>
                    Une fois publiée, votre annonce peut remonter en tête de sa catégorie pendant 7 jours pour{" "}
                    {prixXpf(700)}.
                  </span>
                </dd>
                <dt>
                  <Icon name="verifie" />
                  Vous êtes professionnel ?
                </dt>
                <dd>
                  <span>Connecté avec votre compte pro, vos annonces vont dans votre vitrine (20 au plus).</span>
                  <Link className="link" href="/pros#ouvrir">
                    Voir l&apos;offre vitrine
                  </Link>
                </dd>
              </dl>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

/** Le formulaire pour un particulier connecté ; sinon, ce qu'il faut faire pour publier. */
async function Depot() {
  const compte = await getSession();
  if (!compte) {
    return (
      <div className="stack">
        <div className="avis">
          <p>
            <strong>Connectez-vous pour publier une annonce.</strong>
          </p>
          <p>Le compte est gratuit pour les particuliers. Il sert à retrouver et gérer vos annonces.</p>
        </div>
        <div className="boutons">
          <Link className="btn btn-primary" href="/connexion">
            Se connecter
          </Link>
          <Link className="btn btn-secondary" href="/inscription">
            Créer un compte
          </Link>
        </div>
      </div>
    );
  }
  const pro = compte.type === "pro";
  if (!peutPublier(compte, await getAccountListings(compte))) {
    return (
      <div className="avis avis-erreur" role="alert">
        <p>
          <strong>
            Vous avez déjà {maximumAnnonces(compte)} annonces en ligne, le maximum pour {pro ? "une vitrine" : "un particulier"}.
          </strong>
        </p>
        <p>
          <Link className="link" href="/compte/annonces">
            Voir mes annonces
          </Link>
        </p>
      </div>
    );
  }
  return (
    <div className="stack">
      {pro && (
        <div className="avis">
          <p>
            <strong>Cette annonce ira dans votre vitrine.</strong> Les annonces des professionnels ne sont pas mélangées à
            celles des particuliers : elles apparaissent sur votre vitrine, sans date de fin.
          </p>
        </div>
      )}
      <PublishForm telephone={compte.telephone} />
    </div>
  );
}
