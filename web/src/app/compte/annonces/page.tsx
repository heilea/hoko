import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountListingRow } from "@/components/AccountListingRow";
import { getAccountListings, getVitrine } from "@/lib/accounts";
import { prixXpf } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Mes annonces" };

// Espace privé : la page attend la session côté serveur, sans chercher la navigation instantanée
export const instant = false;

export default async function AccountListingsPage() {
  const compte = await getSession();
  if (!compte) redirect("/connexion");

  const annonces = getAccountListings(compte);
  const vitrine = getVitrine(compte);

  return (
    <>
      <div className="section-head">
        <h1>Mes annonces</h1>
        <span className="muted">
          {vitrine ? `${annonces.length} sur ${vitrine.maximum} annonces` : `${annonces.length} ${annonces.length > 1 ? "annonces" : "annonce"}`}
        </span>
      </div>

      {annonces.length > 0 ? (
        <ul className="suivis">
          {annonces.map((annonce) => (
            <AccountListingRow key={annonce.id} annonce={annonce} />
          ))}
        </ul>
      ) : (
        <div className="empty">
          <p>
            <strong>Vous n&apos;avez pas encore d&apos;annonce.</strong>
          </p>
          <Link className="btn btn-primary" href="/publier">
            Publier une annonce
          </Link>
        </div>
      )}

      <div className="avis">
        {compte.type === "particulier" ? (
          <p>
            Le boost fait remonter une annonce en tête de sa catégorie pendant 7 jours pour {prixXpf(700)}. Il s&apos;active
            à la réception du paiement.
          </p>
        ) : (
          <p>Les annonces de votre vitrine ne peuvent pas être boostées : le boost est réservé aux particuliers.</p>
        )}
        <p className="small">Modifier, retirer ou booster une annonce en ligne n&apos;est pas encore possible.</p>
      </div>
    </>
  );
}
