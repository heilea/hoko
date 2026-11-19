import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountListingRow } from "@/components/AccountListingRow";
import { CONFIRMATION_GESTE, DUREE_ANNONCE_JOURS, MESSAGE_EN_ATTENTE, maximumAnnonces, resumer } from "@/lib/accounts";
import { getAccountListings, getVitrine } from "@/lib/compte-donnees";
import { prixXpf } from "@/lib/format";
import { getSession } from "@/lib/session";
import { vitrineEnLigne } from "@/lib/vitrine";

export const metadata: Metadata = { title: "Mes annonces" };

// Espace privé : la page attend la session côté serveur, sans chercher la navigation instantanée
export const instant = false;

const ERREURS: Record<string, string> = {
  limite: "Vous avez atteint le maximum d'annonces en ligne. Marquez-en une vendue ou retirez-la avant d'en remettre une autre en ligne.",
  en_attente: MESSAGE_EN_ATTENTE,
  geste: "Cette action n'est pas possible pour cette annonce. Rechargez la page et réessayez.",
  indisponible: "Ce service est indisponible pour le moment. Réessayez plus tard.",
};

export default async function AccountListingsPage({ searchParams }: PageProps<"/compte/annonces">) {
  const compte = await getSession();
  if (!compte) redirect("/connexion");

  const [annonces, vitrine] = await Promise.all([getAccountListings(compte), getVitrine(compte)]);
  const actives = resumer(annonces).actives;
  const particulier = compte.type === "particulier";
  const etatVitrine = vitrine ? { enLigne: vitrineEnLigne(vitrine) } : undefined;

  return (
    <>
      <div className="section-head">
        <h1>Mes annonces</h1>
        <span className="muted">
          {actives} en ligne sur {maximumAnnonces(compte)}
        </span>
      </div>

      <Suspense fallback={null}>
        <Message searchParams={searchParams} />
      </Suspense>

      {annonces.length > 0 ? (
        <ul className="suivis">
          {annonces.map((annonce) => (
            <AccountListingRow key={annonce.id} annonce={annonce} vitrine={etatVitrine} />
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
        {particulier ? (
          <>
            <p>
              Une annonce reste en ligne {DUREE_ANNONCE_JOURS} jours après sa validation. Vendue, retirée ou expirée, elle
              quitte le site et libère sa place : vous pouvez la republier quand vous voulez.
            </p>
            <p className="small">
              Une annonce modifiée est vérifiée de nouveau par Hoko avant de revenir en ligne. Le boost fait remonter une
              annonce en tête de sa catégorie pendant 7 jours pour {prixXpf(700)}.
            </p>
          </>
        ) : (
          <>
            <p>
              Les annonces de votre vitrine n&apos;ont pas de date de fin : elles restent en ligne tant que votre vitrine est en
              ligne. Elles ne sont pas mélangées aux annonces des particuliers et ne peuvent pas être boostées.
            </p>
            <p className="small">Une annonce modifiée est vérifiée de nouveau par Hoko avant de revenir en ligne.</p>
          </>
        )}
      </div>
    </>
  );
}

/** Confirmation ou erreur après un geste (`?fait=` ou `?erreur=` dans l'adresse). */
async function Message({ searchParams }: Pick<PageProps<"/compte/annonces">, "searchParams">) {
  const { fait, erreur } = await searchParams;
  const confirmation = typeof fait === "string" ? CONFIRMATION_GESTE[fait] : undefined;
  const probleme = typeof erreur === "string" ? ERREURS[erreur] : undefined;
  if (probleme) {
    return (
      <div className="avis avis-erreur" role="alert">
        <p>
          <strong>{probleme}</strong>
        </p>
      </div>
    );
  }
  if (!confirmation) return null;
  return (
    <div className="avis" role="status">
      <p>
        <strong>{confirmation}</strong>
      </p>
    </div>
  );
}
