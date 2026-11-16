import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PublishForm } from "@/components/PublishForm";
import { MAX_ANNONCES_PARTICULIER } from "@/lib/data";
import { prixXpf } from "@/lib/format";

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
            <PublishForm />

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
                  <span>Vos annonces se publient dans votre vitrine, pas ici.</span>
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
