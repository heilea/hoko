import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { getProCategorySlugs, getProListings, getProsByCategory, getVerifiedPros } from "@/lib/annonces-donnees";
import { getCategory, MAX_ANNONCES_PRO } from "@/lib/data";
import { prixXpf, sigle } from "@/lib/format";

export const metadata: Metadata = {
  title: "Marketplace des pros",
  description: "Les professionnels vérifiés de Polynésie française et leurs vitrines.",
};

type Recherche = PageProps<"/pros">["searchParams"];

export default function ProsPage({ searchParams }: PageProps<"/pros">) {
  return (
    <main>
      <section className="pro-hero">
        <div className="wrap">
          <span className="label">Marketplace pro</span>
          <h1>Les pros vérifiés du fenua</h1>
          <p>Chaque entreprise est contrôlée à partir de son numéro TAHITI avant d&apos;apparaître ici.</p>
        </div>
      </section>

      {/* Le filtre par secteur vient de l'URL : il n'est connu qu'à la requête, d'où le Suspense */}
      <Suspense fallback={<AnnuaireChargement />}>
        <AnnuaireFiltre searchParams={searchParams} />
      </Suspense>

      <section className="band band-suite" id="ouvrir">
        <div className="wrap">
          <div className="offre">
            <div>
              <h2>Ouvrez votre vitrine</h2>
              <p className="prix-offre">
                <strong>{prixXpf(10000)}</strong> par mois
              </p>
            </div>
            <ul>
              <li>
                <Icon name="gratuit" />
                Une page à votre nom : présentation, horaires, téléphone
              </li>
              <li>
                <Icon name="gratuit" />
                Jusqu&apos;à {MAX_ANNONCES_PRO} annonces actives pour vos meilleures ventes
              </li>
              <li>
                <Icon name="gratuit" />
                Le badge « Pro vérifié » après contrôle de votre numéro TAHITI
              </li>
              <li>
                <Icon name="gratuit" />
                Votre nom dans l&apos;annuaire, sur l&apos;accueil et dans votre catégorie
              </li>
            </ul>
            <Link className="btn btn-primary" href="/connexion">
              Ouvrir ma vitrine
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

async function AnnuaireFiltre({ searchParams }: { searchParams: Recherche }) {
  const { secteur } = await searchParams;
  return <Annuaire secteur={Array.isArray(secteur) ? secteur[0] : secteur} />;
}

/** En attendant le filtre demandé dans l'adresse */
function AnnuaireChargement() {
  return (
    <section className="band">
      <div className="wrap">
        <p className="muted" role="status">
          Chargement des pros…
        </p>
      </div>
    </section>
  );
}

/** Filtres par secteur et grille des pros. */
async function Annuaire({ secteur }: { secteur?: string }) {
  const filtres = (await getProCategorySlugs()).flatMap((slug) => getCategory(slug) ?? []);
  const active = filtres.find((c) => c.slug === secteur);
  const pros = active ? await getProsByCategory(active.slug) : await getVerifiedPros();
  const nombres = await Promise.all(pros.map(async (pro) => (await getProListings(pro.slug)).length));

  return (
    <section className="band">
      <div className="wrap stack">
        <nav className="secteurs" aria-label="Filtrer par secteur">
          <Link className="secteur" href="/pros" aria-current={!active ? "true" : undefined}>
            Tous les pros
          </Link>
          {filtres.map((c) => (
            <Link
              key={c.slug}
              className="secteur"
              href={`/pros?secteur=${c.slug}`}
              aria-current={c.slug === active?.slug ? "true" : undefined}
            >
              <Icon name={c.icone} />
              {c.nom}
            </Link>
          ))}
        </nav>

        {pros.length === 0 ? (
          <div className="empty">
            <p>
              <strong>Aucun pro vérifié pour l&apos;instant.</strong>
            </p>
          </div>
        ) : (
          <>
            <p className="small muted">
              {pros.length} {pros.length > 1 ? "pros" : "pro"}
              {active ? ` en ${active.nom}` : ""}
            </p>
            <div className="pros-grille">
              {pros.map((pro, rang) => {
                const nombre = nombres[rang];
                return (
                  <Link key={pro.slug} className="pro-carte" href={`/pros/${pro.slug}`}>
                    <span className="sigle" aria-hidden="true">
                      {sigle(pro.nom)}
                    </span>
                    <h3>{pro.nom}</h3>
                    <span className="small muted">
                      {pro.secteur} · {pro.commune}, {pro.ile}
                    </span>
                    <span className="badge badge-pro">
                      <Icon name="verifie" />
                      Pro vérifié
                    </span>
                    <span className="small pro-carte-pied">
                      {nombre} {nombre > 1 ? "annonces" : "annonce"} · {getCategory(pro.categorie)?.nom}
                      <Icon name="fleche" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
