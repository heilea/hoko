import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryNav } from "@/components/CategoryNav";
import { EspacePub } from "@/components/EspacePub";
import { Icon } from "@/components/Icon";
import { ListingCard } from "@/components/ListingCard";
import { Pagination } from "@/components/Pagination";
import { ProDirectory } from "@/components/ProDirectory";
import { searchListings } from "@/lib/annonces-donnees";
import { prixXpf } from "@/lib/format";
import { lirePage } from "@/lib/pagination";

type Recherche = PageProps<"/">["searchParams"];

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <main>
      <section className="band" aria-label="Publicité">
        <div className="wrap">
          {/* Espace pub d'accueil : un seul annonceur à la fois, 30 jours (SPEC.md, 3 ter) */}
          <EspacePub />
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
          <Suspense fallback={<AnnoncesChargement />}>
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
  const { q, page } = await searchParams;
  const recherche = (Array.isArray(q) ? q[0] : q)?.trim();
  return <Annonces q={recherche} page={lirePage(page)} />;
}

/** En attendant la recherche : le titre est là, mais pas encore d'annonces non filtrées. */
function AnnoncesChargement() {
  return (
    <div className="stack" id="annonces">
      <div className="section-head">
        <h2>Annonces de particuliers</h2>
      </div>
      <p className="muted" role="status">
        Chargement des annonces…
      </p>
    </div>
  );
}

/**
 * Liste des annonces de particuliers, filtrée par la recherche s'il y en a une, 12 par page.
 * Triée par date seulement : pas de boost sur l'accueil (SPEC.md, 4 bis).
 */
async function Annonces({ q, page }: { q?: string; page: number }) {
  const liste = await searchListings(q, page);
  if (page > liste.pages) notFound();
  const annonces = liste.annonces;

  return (
    <div className="stack" id="annonces">
      <div className="section-head">
        <h2>{q ? `Résultats pour « ${q} »` : "Annonces de particuliers"}</h2>
        {q && (
          <span className="small muted">
            {liste.total} {liste.total > 1 ? "annonces" : "annonce"}
          </span>
        )}
      </div>
      {annonces.length > 0 ? (
        <>
          <div className="liste">
            {annonces.map((annonce) => (
              <ListingCard key={annonce.id} annonce={annonce} sansBoost />
            ))}
          </div>
          <Pagination chemin="/" page={liste.page} pages={liste.pages} q={q} />
        </>
      ) : (
        <div className="empty">
          <p>
            <strong>{q ? "Aucune annonce trouvée." : "Aucune annonce pour l'instant."}</strong>
          </p>
          {q ? (
            <Link className="btn btn-secondary" href="/">
              Tout afficher
            </Link>
          ) : (
            <Link className="btn btn-primary" href="/publier">
              Publier la première
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
