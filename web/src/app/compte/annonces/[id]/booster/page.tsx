import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { annulerBoost, commanderBoost } from "@/app/boost-actions";
import {
  BOOST_JOURS,
  lireResultatCommande,
  MAX_BOOSTS_PARTICULIER,
  numeroCommande,
  placesLibres,
  type ResultatCommande,
} from "@/lib/boost";
import { getEtatBoost } from "@/lib/compte-donnees";
import { prixXpf } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Booster une annonce" };

// Espace privé : la page attend la session côté serveur, sans chercher la navigation instantanée
export const instant = false;

/**
 * Boost d'une annonce de particulier : prix de la catégorie, places libres, commande en
 * attente de paiement (numéro à mettre en référence), annulation tant que ce n'est pas payé.
 */
export default async function BoostPage({ params, searchParams }: PageProps<"/compte/annonces/[id]/booster">) {
  const compte = await getSession();
  if (!compte) redirect("/connexion");
  if (compte.type !== "particulier") notFound();

  const { id } = await params;
  const etat = await getEtatBoost(compte, id);
  if (!etat) notFound();
  const libres = placesLibres(etat.placesPrises, etat.places);

  return (
    <>
      <div className="section-head">
        <h1>Booster l&apos;annonce</h1>
        <Link className="link" href="/compte/annonces">
          Retour à mes annonces
        </Link>
      </div>

      <Suspense fallback={null}>
        <Message searchParams={searchParams} />
      </Suspense>

      <div className="carte stack">
        <h2>{etat.titre}</h2>
        <p>
          Votre annonce passe <strong>en tête de sa catégorie pendant {BOOST_JOURS} jours</strong>, avec le badge « Boost ». Il
          n&apos;y a que {etat.places} places par catégorie : une annonce boostée y reste en permanence, sans tourner avec
          d&apos;autres.
        </p>
        <p className="price">{prixXpf(etat.prixXpf)}</p>

        {etat.commande?.statut === "actif" ? (
          <p>
            <strong>Boost actif jusqu&apos;au {etat.commande.finLe}.</strong>
          </p>
        ) : etat.commande ? (
          <>
            <div className="avis">
              <p>
                <strong>Commande {numeroCommande(etat.commande.id)} : en attente de paiement ({prixXpf(etat.commande.montantXpf)}).</strong>
              </p>
              <p className="small">
                Hoko vous contacte pour le paiement (virement ou espèces). Indiquez le numéro {numeroCommande(etat.commande.id)} en
                référence. Les {BOOST_JOURS} jours commencent quand le paiement est reçu.
              </p>
            </div>
            <form action={annulerBoost}>
              <input type="hidden" name="annonce" value={etat.id} />
              <input type="hidden" name="commande" value={etat.commande.id} />
              <button className="btn btn-secondary btn-petit" type="submit">
                Annuler la commande
              </button>
            </form>
          </>
        ) : !etat.enLigne ? (
          <p className="muted">Seule une annonce en ligne peut être boostée.</p>
        ) : libres === 0 ? (
          <div className="avis">
            <p>
              <strong>Complet : les {etat.places} places de la catégorie sont prises.</strong>
            </p>
            <p className="small">
              {etat.libreLe ? `Prochaine place libre le ${etat.libreLe}.` : "Une place peut se libérer à tout moment."} Revenez
              à cette date.
            </p>
          </div>
        ) : (
          <>
            <p className="small muted">
              {libres} place{libres > 1 ? "s" : ""} libre{libres > 1 ? "s" : ""} sur {etat.places} dans cette catégorie.{" "}
              {MAX_BOOSTS_PARTICULIER} boosts à la fois au plus par compte.
            </p>
            <form action={commanderBoost}>
              <input type="hidden" name="id" value={etat.id} />
              <button className="btn btn-primary" type="submit">
                Commander le boost ({prixXpf(etat.prixXpf)})
              </button>
            </form>
            <p className="small muted">
              La commande réserve votre place. Hoko vous contacte ensuite pour le paiement ; rien n&apos;est payé en ligne.
            </p>
          </>
        )}
      </div>
    </>
  );
}

const ERREURS: Record<string, string> = {
  pas_en_ligne: "Seule une annonce en ligne peut être boostée.",
  deja: "Cette annonce a déjà un boost en cours ou en attente.",
  reserve: "Le boost est réservé aux annonces de particuliers.",
  annulation: "La commande n'a pas pu être annulée : elle est peut-être déjà payée.",
  indisponible: "Le boost est indisponible pour le moment. Réessayez plus tard.",
};

const RESULTATS: Record<ResultatCommande, string> = {
  commande: "Commande enregistrée. Votre place est réservée en attendant le paiement.",
  complet: "Trop tard : la dernière place vient d'être prise.",
  max_compte: `Vous avez déjà ${MAX_BOOSTS_PARTICULIER} boosts en cours ou en attente. Attendez la fin de l'un d'eux.`,
};

async function Message({ searchParams }: Pick<PageProps<"/compte/annonces/[id]/booster">, "searchParams">) {
  const { resultat, erreur } = await searchParams;
  if (typeof erreur === "string") {
    return (
      <div className="avis avis-erreur" role="alert">
        <p>
          <strong>{ERREURS[erreur] ?? ERREURS.indisponible}</strong>
        </p>
      </div>
    );
  }
  const lu = lireResultatCommande(resultat);
  const texte = resultat === "annulee" ? "Commande annulée : la place est libérée." : lu ? RESULTATS[lu] : null;
  if (!texte) return null;
  return (
    <div className={`avis ${resultat === "commande" || resultat === "annulee" ? "" : "avis-erreur"}`} role="status">
      <p>
        <strong>{texte}</strong>
      </p>
    </div>
  );
}
