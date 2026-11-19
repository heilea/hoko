import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PhotosAnnonce } from "@/components/PhotosAnnonce";
import { PublishForm } from "@/components/PublishForm";
import { getAnnoncePourModifier } from "@/lib/compte-donnees";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Modifier une annonce" };

// Espace privé : la page attend la session côté serveur, sans chercher la navigation instantanée
export const instant = false;

export default async function EditListingPage({ params }: PageProps<"/compte/annonces/[id]/modifier">) {
  const compte = await getSession();
  if (!compte) redirect("/connexion");

  const { id } = await params;
  // La base ne renvoie que les annonces du compte connecté
  const annonce = await getAnnoncePourModifier(compte, id);
  if (!annonce) notFound();

  return (
    <>
      <div className="section-head">
        <h1>Modifier l&apos;annonce</h1>
        <Link className="link" href="/compte/annonces">
          Retour à mes annonces
        </Link>
      </div>
      <PhotosAnnonce annonceId={annonce.id} photos={annonce.photos} />
      <PublishForm telephone={compte.telephone} annonce={annonce} />
    </>
  );
}
