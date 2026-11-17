import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { ModerationForm } from "@/components/ModerationForm";
import { PhotoCadree } from "@/components/PhotoCadree";
import { getAnnoncesEnAttente, TAILLE_FILE } from "@/lib/admin-donnees";
import { getCategory } from "@/lib/data";
import { prixXpf } from "@/lib/format";
import { versPhotos } from "@/lib/photos";
import { attenteDepuis } from "@/lib/moderation";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Annonces à valider" };

export const instant = false;

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  // Chaque page vérifie le rôle elle-même, sans compter seulement sur la mise en page
  const compte = await getSession();
  if (!compte?.admin) notFound();

  const { annonces, total, maintenant } = await getAnnoncesEnAttente();

  return (
    <>
      <div className="section-head">
        <h1>Annonces à valider</h1>
        <span className="muted">
          {total} en attente{total > TAILLE_FILE ? `, les ${TAILLE_FILE} plus anciennes affichées` : ""}
        </span>
      </div>

      <Suspense fallback={null}>
        <Confirmation searchParams={searchParams} />
      </Suspense>

      {annonces.length === 0 ? (
        <div className="empty">
          <p>
            <strong>Aucune annonce en attente.</strong>
          </p>
          <p className="muted">Les nouvelles annonces apparaîtront ici, les plus anciennes en premier.</p>
        </div>
      ) : (
        <ul className="moderation">
          {annonces.map((annonce) => {
            const categorie = getCategory(annonce.categories?.slug);
            const photos = versPhotos(annonce.photos);
            return (
              <li key={annonce.id} className="carte moderation-carte">
                <div className="moderation-tete">
                  <h2>{annonce.titre}</h2>
                  <span className="price">
                    {prixXpf(annonce.prix_xpf)}
                    {annonce.suffixe_prix}
                  </span>
                </div>
                <p className="small muted lieu">
                  {categorie && <Icon name={categorie.icone} />}
                  {annonce.categories?.nom ?? "Sans catégorie"} · {annonce.commune}, {annonce.ile} · par {annonce.vendeur_nom} ·
                  déposée {attenteDepuis(annonce.created_at, maintenant)}
                </p>
                {photos.length > 0 ? (
                  <ul className="vignettes" aria-label="Photos de l'annonce">
                    {photos.map((photo, rang) => (
                      <li key={photo.id}>
                        {/* Ouvre la grande image dans un nouvel onglet, pour la vérifier en détail */}
                        <a href={photo.grande} target="_blank" rel="noreferrer">
                          <PhotoCadree src={photo.vignette} alt={`Photo ${rang + 1} (ouvrir en grand)`} />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="small muted">Aucune photo.</p>
                )}
                <p className="description">{annonce.description}</p>
                <ModerationForm id={annonce.id} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

async function Confirmation({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const { fait } = await searchParams;
  if (fait !== "active" && fait !== "refusee") return null;
  return (
    <div className="avis" role="status">
      <p>
        <strong>
          {fait === "active" ? "Annonce validée : elle est maintenant en ligne." : "Annonce refusée : l'annonceur verra le motif."}
        </strong>
      </p>
    </div>
  );
}
