import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SignalementForm } from "@/components/SignalementForm";
import { dateCourte } from "@/lib/accounts";
import { getSignalementsOuverts } from "@/lib/admin-donnees";
import { getSession } from "@/lib/session";
import { libelleMotif } from "@/lib/signalements";

export const metadata: Metadata = { title: "Signalements" };

export const instant = false;

/** Annonces signalées par les visiteurs (SPEC.md, section 4 septies). Délai visé : 48 h. */
export default async function SignalementsPage({ searchParams }: PageProps<"/admin/signalements">) {
  // Chaque page vérifie le rôle elle-même, sans compter seulement sur la mise en page
  const compte = await getSession();
  if (!compte?.admin) notFound();

  const annonces = await getSignalementsOuverts();

  return (
    <>
      <div className="section-head">
        <h1>Signalements</h1>
        <span className="muted">{annonces.length} annonce(s) signalée(s), les plus signalées d&apos;abord</span>
      </div>

      <Suspense fallback={null}>
        <Confirmation searchParams={searchParams} />
      </Suspense>

      {annonces.length === 0 ? (
        <div className="empty">
          <p>
            <strong>Aucun signalement en attente.</strong>
          </p>
          <p className="muted">Les annonces signalées par les visiteurs apparaîtront ici. Délai visé : 48 h.</p>
        </div>
      ) : (
        <ul className="moderation">
          {annonces.map((annonce) => (
            <li key={annonce.annonceId} className="carte moderation-carte">
              <div className="moderation-tete">
                <h2>
                  {annonce.enLigne ? (
                    <Link className="link" href={`/annonces/${annonce.annonceId}`} target="_blank">
                      {annonce.titre}
                    </Link>
                  ) : (
                    annonce.titre
                  )}
                </h2>
                <strong>
                  {annonce.nombre} signalement{annonce.nombre > 1 ? "s" : ""}
                </strong>
              </div>
              <p className="small muted">
                Annonce n° {annonce.annonceId} · par {annonce.vendeur} · dernier signalement le {dateCourte(annonce.dernier)}
                {!annonce.enLigne && " · n'est plus en ligne"}
              </p>
              <ul className="signalement-motifs" aria-label="Motifs">
                {annonce.parMotif.map((m) => (
                  <li key={m.motif} className="badge badge-boost">
                    {libelleMotif(m.motif)} × {m.nombre}
                  </li>
                ))}
              </ul>
              {annonce.details.length > 0 && (
                <ul className="signalement-details small" aria-label="Précisions des visiteurs">
                  {annonce.details.map((texte, rang) => (
                    <li key={rang}>« {texte} »</li>
                  ))}
                </ul>
              )}
              <SignalementForm id={annonce.annonceId} enLigne={annonce.enLigne} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function Confirmation({ searchParams }: Pick<PageProps<"/admin/signalements">, "searchParams">) {
  const { fait } = await searchParams;
  if (fait !== "retirer" && fait !== "classer") return null;
  return (
    <div className="avis" role="status">
      <p>
        <strong>
          {fait === "retirer"
            ? "Annonce retirée : elle a quitté le site et l'annonceur verra le motif."
            : "Signalements classés sans suite : l'annonce reste en ligne."}
        </strong>
      </p>
    </div>
  );
}
