import Link from "next/link";
import { Suspense } from "react";
import { CategoryNav } from "@/components/CategoryNav";
import { Icon } from "@/components/Icon";
import { ListingCard } from "@/components/ListingCard";
import { ProDirectory } from "@/components/ProDirectory";
import { searchListings } from "@/lib/data";
import { prixXpf } from "@/lib/format";

type Recherche = PageProps<"/">["searchParams"];

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <main>
      <section className="band" aria-label="Publicité">
        <div className="wrap">
          {/* Espace pub d'accueil : un seul annonceur à la fois, vendu au mois */}
          <div className="panneau">
            <span className="label">Publicité · exemple</span>
            <strong>Votre publicité ici</strong>
            <p>
              Le premier espace de la page. <span className="prix">{prixXpf(100000)}</span> par mois.
            </p>
            <Link className="btn btn-sombre" href="/publicite">
              Réserver
            </Link>
          </div>
        </div>
      </section>

      <section className="band band-suite" id="categories">
        <div className="wrap stack">
          <h2>Catégories</h2>
          <CategoryNav />
        </div>
      </section>

      <section className="band band-suite">
        <div className="wrap cols">
          {/* La recherche vient de l'URL : elle n'est connue qu'à la requête, d'où le Suspense */}
          <Suspense fallback={<Annonces enAttente />}>
            <AnnoncesRecherchees searchParams={searchParams} />
          </Suspense>
          <ProDirectory />
        </div>
      </section>

      <section className="band band-suite">
        <div className="wrap rappels">
          <span>
            <Icon name="gratuit" />
            Publier est gratuit
          </span>
          <span>
            <Icon name="telephone" />
            Contact direct, sans compte
          </span>
          <span>
            <Icon name="boost" />
            Boost 7 jours : {prixXpf(700)}
          </span>
        </div>
      </section>
    </main>
  );
}

async function AnnoncesRecherchees({ searchParams }: { searchParams: Recherche }) {
  const { q } = await searchParams;
  const recherche = (Array.isArray(q) ? q[0] : q)?.trim();
  return <Annonces q={recherche} />;
}

/**
 * Liste des annonces de particuliers. `enAttente` sert d'état de chargement : le titre est là,
 * mais la liste attend la recherche pour ne pas montrer des annonces non filtrées.
 */
function Annonces({ q, enAttente = false }: { q?: string; enAttente?: boolean }) {
  const annonces = enAttente ? [] : searchListings(q);

  return (
    <div className="stack" id="annonces">
      <div className="section-head">
        <h2>{q ? `Résultats pour « ${q} »` : "Annonces de particuliers"}</h2>
        {q && (
          <span className="small muted">
            {annonces.length} {annonces.length > 1 ? "annonces" : "annonce"}
          </span>
        )}
      </div>
      {enAttente ? (
        <p className="muted" role="status">
          Chargement des annonces…
        </p>
      ) : annonces.length > 0 ? (
        <div className="liste">
          {annonces.map((annonce) => (
            <ListingCard key={annonce.id} annonce={annonce} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>
            <strong>Aucune annonce trouvée.</strong>
          </p>
          <Link className="btn btn-secondary" href="/">
            Tout afficher
          </Link>
        </div>
      )}
    </div>
  );
}
