import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryNav } from "@/components/CategoryNav";
import { EspacePub } from "@/components/EspacePub";
import { Icon } from "@/components/Icon";
import { ListingCard } from "@/components/ListingCard";
import { Pagination } from "@/components/Pagination";
import { ProDirectory } from "@/components/ProDirectory";
import { getCategoryListings } from "@/lib/annonces-donnees";
import { categories, getCategory } from "@/lib/data";
import { lirePage } from "@/lib/pagination";

type Props = PageProps<"/categories/[slug]">;

// Les catégories connues sont pré-rendues à la construction du site.
export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const categorie = getCategory(slug);
  if (!categorie) return { title: "Catégorie introuvable" };
  return { title: categorie.nom, description: categorie.description };
}

export default function CategoryPage({ params, searchParams }: Props) {
  return (
    <main>
      {/* Le nom de la catégorie vient de l'URL : il est lu sous un Suspense pour garder la navigation instantanée */}
      <Suspense
        fallback={
          <section className="band">
            <div className="wrap">
              <p className="muted" role="status">
                Chargement de la catégorie…
              </p>
            </div>
          </section>
        }
      >
        <Categorie params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Categorie({ params, searchParams }: Props) {
  const [{ slug }, { page: pageDemandee }] = await Promise.all([params, searchParams]);
  const categorie = getCategory(slug);
  if (!categorie) notFound();

  const liste = await getCategoryListings(categorie.slug, lirePage(pageDemandee));
  if (liste.page > liste.pages) notFound();
  const annonces = liste.annonces;

  return (
    <>
      <section className="band">
        <div className="wrap stack">
          <nav className="fil small" aria-label="Fil d'Ariane">
            <Link href="/">Accueil</Link>
            <Icon name="chevron" />
            <span>{categorie.nom}</span>
          </nav>

          {/* En-tête de la catégorie : titre, description courte et espace pub lié à la catégorie */}
          <header className="cat-entete">
            <div className="cat-titre">
              <span className="cat-icone">
                <Icon name={categorie.icone} />
              </span>
              <div>
                <h1>{categorie.nom}</h1>
                <p className="muted">{categorie.description}</p>
              </div>
            </div>
            <EspacePub categorie={categorie} />
          </header>
        </div>
      </section>

      <section className="band band-suite">
        <div className="wrap cols">
          <div className="stack" id="annonces">
            <div className="section-head">
              <h2>Annonces de particuliers</h2>
              <span className="small muted">
                {liste.total} {liste.total > 1 ? "annonces" : "annonce"}
              </span>
            </div>
            {annonces.length > 0 ? (
              <>
                <div className="liste">
                  {annonces.map((annonce) => (
                    <ListingCard key={annonce.id} annonce={annonce} />
                  ))}
                </div>
                <Pagination chemin={`/categories/${categorie.slug}`} page={liste.page} pages={liste.pages} />
              </>
            ) : (
              <div className="empty">
                <p>
                  <strong>Aucune annonce en {categorie.nom} pour l&apos;instant.</strong>
                </p>
                <p className="muted">Publiez la première, c&apos;est gratuit.</p>
                <Link className="btn btn-primary" href="/publier">
                  Publier une annonce
                </Link>
              </div>
            )}
          </div>
          <ProDirectory categorie={categorie} />
        </div>
      </section>

      <section className="band band-suite">
        <div className="wrap stack">
          <h2>Autres catégories</h2>
          <CategoryNav active={categorie.slug} />
        </div>
      </section>
    </>
  );
}
