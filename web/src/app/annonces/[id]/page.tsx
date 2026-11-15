import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { ListingCard } from "@/components/ListingCard";
import { RevealPhone } from "@/components/RevealPhone";
import { getCategory, getListing, getListingIds, getPro, getRelatedListings } from "@/lib/data";
import { prixXpf, sigle } from "@/lib/format";

type Props = PageProps<"/annonces/[id]">;

// Les annonces connues sont pré-rendues à la construction du site.
export function generateStaticParams() {
  return getListingIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const annonce = getListing(id);
  if (!annonce) return { title: "Annonce introuvable" };
  return {
    title: annonce.titre,
    description: `${prixXpf(annonce.prixXpf)}${annonce.suffixePrix ?? ""} · ${annonce.commune}, ${annonce.ile}`,
  };
}

export default function ListingPage({ params }: Props) {
  return (
    <main>
      {/* L'identifiant vient de l'URL : il est lu sous un Suspense pour garder la navigation instantanée */}
      <Suspense
        fallback={
          <section className="band">
            <div className="wrap">
              <p className="muted" role="status">
                Chargement de l&apos;annonce…
              </p>
            </div>
          </section>
        }
      >
        <Fiche params={params} />
      </Suspense>
    </main>
  );
}

async function Fiche({ params }: Pick<Props, "params">) {
  const { id } = await params;
  const annonce = getListing(id);
  if (!annonce) notFound();

  const categorie = getCategory(annonce.categorie);
  const autres = getRelatedListings(annonce);
  // Annonce pro : elle appartient à une vitrine et renvoie vers elle, pas vers les catégories de particuliers
  const pro = annonce.shopId ? getPro(annonce.shopId) : undefined;

  return (
    <>
      <section className="band">
        <div className="wrap stack">
          <nav className="fil small" aria-label="Fil d'Ariane">
            <Link href="/">Accueil</Link>
            {pro ? (
              <>
                <Icon name="chevron" />
                <Link href="/pros">Marketplace pro</Link>
                <Icon name="chevron" />
                <Link href={`/pros/${pro.slug}`}>{pro.nom}</Link>
              </>
            ) : (
              categorie && (
                <>
                  <Icon name="chevron" />
                  <Link href={`/categories/${categorie.slug}`}>{categorie.nom}</Link>
                </>
              )
            )}
          </nav>

          <div className="cols">
            <article className="stack">
              {/* Emplacement des photos (JPEG, 4 Mo max) : l'envoi arrive avec le dépôt d'annonce */}
              <div className="visuel">
                {categorie && <Icon name={categorie.icone} />}
                <span className="small muted">Pas encore de photo</span>
              </div>

              <div className="fiche-titre">
                {annonce.boost && <span className="badge badge-boost">Boost</span>}
                <h1>{annonce.titre}</h1>
                <span className="muted lieu">
                  <Icon name="lieu" />
                  {annonce.commune}, {annonce.ile} · publiée {annonce.publiee}
                </span>
              </div>

              <div className="stack">
                <h2>Description</h2>
                <p className="description">{annonce.description}</p>
              </div>

              <dl className="details">
                <dt>Catégorie</dt>
                <dd>{categorie?.nom ?? "Autre"}</dd>
                <dt>Lieu</dt>
                <dd>
                  {annonce.commune}, {annonce.ile}
                </dd>
                <dt>Publiée</dt>
                <dd>{annonce.publiee}</dd>
                <dt>Référence</dt>
                <dd>Annonce n° {annonce.id}</dd>
              </dl>
            </article>

            <aside className="achat" aria-label="Prix et contact">
              <span className="prix-fiche">
                {prixXpf(annonce.prixXpf)}
                {annonce.suffixePrix && <span className="suffixe">{annonce.suffixePrix}</span>}
              </span>
              {pro ? (
                <Link className="vendeur vendeur-pro" href={`/pros/${pro.slug}`}>
                  <span className="sigle" aria-hidden="true">
                    {sigle(pro.nom)}
                  </span>
                  <span>
                    <strong>{pro.nom}</strong>
                    <span className="badge badge-pro">
                      <Icon name="verifie" />
                      Pro vérifié
                    </span>
                  </span>
                </Link>
              ) : (
                <div className="vendeur">
                  <span className="sigle" aria-hidden="true">
                    {annonce.vendeur[0]}
                  </span>
                  <span>
                    <strong>{annonce.vendeur}</strong>
                    <span className="small muted">Particulier</span>
                  </span>
                </div>
              )}
              <RevealPhone cible={{ type: "annonce", id: annonce.id }} nom={annonce.vendeur} />
              {pro && (
                <Link className="btn btn-secondary btn-block" href={`/pros/${pro.slug}`}>
                  Voir la vitrine
                </Link>
              )}
            </aside>
          </div>
        </div>
      </section>

      {autres.length > 0 && (
        <section className="band band-suite">
          <div className="wrap stack">
            <h2>{pro ? `Autres annonces de ${pro.nom}` : "Autres annonces"}</h2>
            <div className="liste">
              {autres.map((autre) => (
                <ListingCard key={autre.id} annonce={autre} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
