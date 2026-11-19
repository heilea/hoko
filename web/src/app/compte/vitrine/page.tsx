import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { VitrineForm } from "@/components/VitrineForm";
import { LIBELLE_VITRINE } from "@/lib/accounts";
import { getVitrine } from "@/lib/compte-donnees";
import { getSession } from "@/lib/session";
import { etapesVitrine, vitrineEnLigne } from "@/lib/vitrine";

export const metadata: Metadata = { title: "Ma vitrine" };

// Espace privé : la page attend la session côté serveur, sans chercher la navigation instantanée
export const instant = false;

export default async function VitrinePage({ searchParams }: PageProps<"/compte/vitrine">) {
  const compte = await getSession();
  if (!compte) redirect("/connexion");
  // Seul un pro a une vitrine
  const vitrine = await getVitrine(compte);
  if (!vitrine) notFound();

  const etapes = etapesVitrine(vitrine);

  return (
    <>
      <div className="section-head">
        <h1>Ma vitrine</h1>
        <span className="suivi-badges">
          <span className={`badge ${vitrine.statut === "actif" ? "badge-statut statut-active" : "badge-attente"}`}>
            {LIBELLE_VITRINE[vitrine.statut]}
          </span>
          {vitrine.verifie && (
            <span className="badge badge-pro">
              <Icon name="verifie" />
              Pro vérifié
            </span>
          )}
        </span>
      </div>

      <Suspense fallback={null}>
        <Confirmation searchParams={searchParams} />
      </Suspense>

      {vitrineEnLigne(vitrine) ? (
        <div className="avis">
          <p>Votre vitrine est en ligne, avec ses annonces validées.</p>
          <p>
            <Link className="link" href={`/pros/${vitrine.slug}`}>
              Voir ma vitrine publique <Icon name="fleche" />
            </Link>
          </p>
        </div>
      ) : (
        <div className="avis">
          <p>
            <strong>Votre vitrine n&apos;est pas encore visible.</strong> Vous pouvez déjà la remplir et préparer vos annonces :
            elles apparaîtront ensemble quand la vitrine sera en ligne.
          </p>
          <ul className="small">
            {etapes.map((etape) => (
              <li key={etape}>{etape}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="carte">
        <h2>{vitrine.nom}</h2>
        <p className="small muted">
          Le nom de l&apos;entreprise et le numéro TAHITI ont été contrôlés par Hoko : pour les changer, contactez Hoko.
        </p>
        <VitrineForm
          valeurs={{
            secteur: vitrine.categorie,
            ile: vitrine.ile,
            commune: vitrine.commune,
            presentation: vitrine.presentation,
            horaires: vitrine.horaires.join("\n"),
          }}
        />
      </div>
    </>
  );
}

async function Confirmation({ searchParams }: Pick<PageProps<"/compte/vitrine">, "searchParams">) {
  const { fait } = await searchParams;
  if (fait !== "1") return null;
  return (
    <div className="avis" role="status">
      <p>
        <strong>Vitrine enregistrée.</strong>
      </p>
    </div>
  );
}
