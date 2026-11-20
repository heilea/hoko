import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { categories } from "@/lib/data";
import { prixXpf } from "@/lib/format";
import { PUB_HAUTEUR, PUB_JOURS, PUB_LARGEUR } from "@/lib/pubs";
import { getPubsEnPlace, getPubTarifs } from "@/lib/pubs-donnees";

export const metadata: Metadata = {
  title: "Réserver un espace pub",
  description: "Votre publicité sur la page d'accueil de Hoko ou en tête d'une catégorie, pour 30 jours.",
};

/**
 * Espaces pub (SPEC.md, 3 ter) : tarifs, emplacements libres ou occupés, comment réserver.
 * Pas de réservation en ligne en V1 : l'annonceur contacte Hoko, qui crée la pub.
 */
export default function PublicitePage() {
  return (
    <main>
      <section className="band">
        <div className="wrap stack">
          <h1>Réserver un espace pub</h1>
          <p className="muted">
            Un seul annonceur à la fois par emplacement, pendant {PUB_JOURS} jours à partir du paiement. Pas de reconduction
            automatique.
          </p>
          <Suspense
            fallback={
              <p className="muted" role="status">
                Chargement des emplacements…
              </p>
            }
          >
            <Emplacements />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

async function Emplacements() {
  const [pubs, tarifs] = await Promise.all([getPubsEnPlace(), getPubTarifs()]);
  const contact = process.env.CONTACT_EMAIL?.trim();

  return (
    <>
      <div className="carte stack">
        <h2>Page d&apos;accueil</h2>
        <p>Le premier espace du site, vu par tous les visiteurs.</p>
        {tarifs.accueil && <p className="price">{prixXpf(tarifs.accueil)}</p>}
        <p className={pubs.accueil ? "muted" : ""}>
          {pubs.accueil ? `Occupé jusqu'au ${pubs.accueil.finLe}.` : <strong>Libre en ce moment.</strong>}
        </p>
      </div>

      <div className="carte stack">
        <h2>En-tête d&apos;une catégorie</h2>
        <p>Votre publicité en tête de la catégorie de votre métier, par exemple un garage dans « Véhicules ».</p>
        {tarifs.categorie && <p className="price">{prixXpf(tarifs.categorie)}</p>}
        <ul className="small">
          {categories.map((c) => {
            const pub = pubs.categories[c.slug];
            return (
              <li key={c.slug}>
                <Link className="link" href={`/categories/${c.slug}`}>
                  {c.nom}
                </Link>{" "}
                : {pub ? <span className="muted">occupé jusqu&apos;au {pub.finLe}</span> : <strong>libre</strong>}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="carte stack">
        <h2>Comment réserver</h2>
        <ol className="small">
          <li>
            Envoyez-nous votre visuel : image JPEG de {PUB_LARGEUR} × {PUB_HAUTEUR} px (bandeau), 4 Mo au plus, et l&apos;adresse
            de votre site ou de votre page.
          </li>
          <li>Nous vous donnons un numéro de commande, à indiquer en référence du paiement.</li>
          <li>Votre publicité est en ligne dès le paiement reçu, pour {PUB_JOURS} jours.</li>
        </ol>
        {contact ? (
          <a className="btn btn-primary" href={`mailto:${contact}?subject=${encodeURIComponent("Réservation d'un espace pub")}`}>
            Nous écrire
          </a>
        ) : (
          <p className="muted">Contactez l&apos;équipe Hoko pour réserver.</p>
        )}
      </div>
    </>
  );
}
