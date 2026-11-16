import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { ListingCard } from "@/components/ListingCard";
import { RevealPhone } from "@/components/RevealPhone";
import { getPro, getProListings } from "@/lib/annonces-donnees";
import { getCategory, MAX_ANNONCES_PRO } from "@/lib/data";
import { sigle } from "@/lib/format";

type Props = PageProps<"/pros/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pro = await getPro(slug);
  if (!pro) return { title: "Vitrine introuvable" };
  return { title: pro.nom, description: `${pro.secteur} à ${pro.commune}, ${pro.ile}. ${pro.presentation}` };
}

export default function ShopPage({ params }: Props) {
  return (
    <main>
      {/* Le nom de la vitrine vient de l'URL : il est lu sous un Suspense pour garder la navigation instantanée */}
      <Suspense
        fallback={
          <section className="band">
            <div className="wrap">
              <p className="muted" role="status">
                Chargement de la vitrine…
              </p>
            </div>
          </section>
        }
      >
        <Vitrine params={params} />
      </Suspense>
    </main>
  );
}

async function Vitrine({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const pro = await getPro(slug);
  if (!pro) notFound();

  const annonces = await getProListings(pro.slug);
  const categorie = getCategory(pro.categorie);

  return (
    <>
      <section className="band">
        <div className="wrap stack">
          <nav className="fil small" aria-label="Fil d'Ariane">
            <Link href="/">Accueil</Link>
            <Icon name="chevron" />
            <Link href="/pros">Marketplace pro</Link>
            <Icon name="chevron" />
            <span>{pro.nom}</span>
          </nav>

          {/* Bannière et logo : les visuels du pro arriveront avec l'envoi de photos */}
          <header className="vitrine-tete">
            <div className="vitrine-banniere" aria-hidden="true" />
            <div className="vitrine-identite">
              <span className="sigle" aria-hidden="true">
                {sigle(pro.nom)}
              </span>
              <div>
                <h1>{pro.nom}</h1>
                <span className="muted">
                  {pro.secteur} · {pro.commune}, {pro.ile}
                </span>
              </div>
              <span className="badge badge-pro">
                <Icon name="verifie" />
                Pro vérifié
              </span>
            </div>
          </header>
        </div>
      </section>

      <section className="band band-suite">
        <div className="wrap cols">
          <div className="stack">
            <div className="stack">
              <h2>Présentation</h2>
              <p className="description">{pro.presentation}</p>
            </div>

            <div className="stack" id="annonces">
              <div className="section-head">
                <h2>Annonces de {pro.nom}</h2>
                <span className="small muted">
                  {annonces.length} sur {MAX_ANNONCES_PRO} annonces
                </span>
              </div>
              {annonces.length > 0 ? (
                <div className="liste">
                  {annonces.map((annonce) => (
                    <ListingCard key={annonce.id} annonce={annonce} />
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <p>
                    <strong>{pro.nom} n&apos;a pas encore publié d&apos;annonce.</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="achat" aria-label="Contact et horaires">
            <RevealPhone cible={{ type: "pro", id: pro.slug }} nom={pro.nom} />
            <dl className="infos">
              <dt>
                <Icon name="horloge" />
                Horaires
              </dt>
              <dd>
                {pro.horaires.map((ligne) => (
                  <span key={ligne}>{ligne}</span>
                ))}
              </dd>
              <dt>
                <Icon name="lieu" />
                Adresse
              </dt>
              <dd>
                <span>
                  {pro.commune}, {pro.ile}
                </span>
              </dd>
              {categorie && (
                <>
                  <dt>
                    <Icon name={categorie.icone} />
                    Secteur
                  </dt>
                  <dd>
                    <Link className="link" href={`/pros?secteur=${categorie.slug}`}>
                      Autres pros en {categorie.nom}
                    </Link>
                  </dd>
                </>
              )}
            </dl>
          </aside>
        </div>
      </section>
    </>
  );
}
