import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { creerPub, deciderPub } from "@/app/pub-actions";
import { categories } from "@/lib/data";
import { prixXpf } from "@/lib/format";
import { CONFIRMATION_PUB, LIBELLE_GESTE_PUB, lireGestePub, numeroPub, PUB_HAUTEUR, PUB_JOURS, PUB_LARGEUR } from "@/lib/pubs";
import { getPubsAdmin, type PubAdmin } from "@/lib/pubs-donnees";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Espaces pub" };

export const instant = false;

/**
 * Espaces pub (SPEC.md, 3 ter) : créer une pub pour un annonceur, l'activer à réception du
 * paiement (30 jours), annuler une commande non payée, retirer une pub en place.
 */
export default async function AdminPubsPage({ searchParams }: PageProps<"/admin/pubs">) {
  const compte = await getSession();
  if (!compte?.admin) notFound();

  const pubs = await getPubsAdmin();
  const enAttente = pubs.filter((p) => p.etat === "en_attente");
  const enPlace = pubs.filter((p) => p.etat === "en_place");
  const passees = pubs.filter((p) => p.etat === "terminee" || p.etat === "annulee").slice(0, 20);

  return (
    <>
      <div className="section-head">
        <h1>Espaces pub</h1>
        <span className="muted">
          {enAttente.length} en attente de paiement, {enPlace.length} en place
        </span>
      </div>

      <Suspense fallback={null}>
        <Message searchParams={searchParams} />
      </Suspense>

      <div className="avis">
        <p className="small">
          Un seul annonceur à la fois par emplacement. Créez la pub quand l&apos;annonceur vous envoie son visuel, donnez-lui le
          numéro de commande pour le paiement, puis activez à réception des fonds : les {PUB_JOURS} jours commencent à ce moment.
        </p>
      </div>

      <h2>En place</h2>
      {enPlace.length === 0 ? (
        <p className="muted">Aucune pub en place.</p>
      ) : (
        <ListePubs pubs={enPlace} enPlace={enPlace} enAttente={enAttente} />
      )}

      <h2>En attente de paiement</h2>
      {enAttente.length === 0 ? (
        <p className="muted">Aucune commande en attente.</p>
      ) : (
        <ListePubs pubs={enAttente} enPlace={enPlace} enAttente={enAttente} />
      )}

      <h2>Nouvelle pub</h2>
      <form action={creerPub} className="carte stack">
        <div className="champ">
          <label htmlFor="annonceur">Annonceur</label>
          <input id="annonceur" name="annonceur" required minLength={2} maxLength={80} autoComplete="off" />
        </div>
        <div className="champ">
          <label htmlFor="emplacement">Emplacement</label>
          <select id="emplacement" name="emplacement" required defaultValue="categorie">
            <option value="accueil">Page d&apos;accueil</option>
            <option value="categorie">En-tête d&apos;une catégorie</option>
          </select>
        </div>
        <div className="champ">
          <label htmlFor="categorie">Catégorie (pour un en-tête de catégorie)</label>
          <select id="categorie" name="categorie" defaultValue="">
            <option value="">Choisir…</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>
        <div className="champ">
          <label htmlFor="lien">Lien (site, page Facebook ou vitrine Hoko de l&apos;annonceur)</label>
          <input id="lien" name="lien" type="url" required maxLength={500} placeholder="https://" />
        </div>
        <div className="champ">
          <label htmlFor="visuel">Visuel</label>
          <input id="visuel" name="visuel" type="file" accept="image/jpeg" required />
          <span className="small muted">
            JPEG, 4 Mo au plus, bandeau de {PUB_LARGEUR} × {PUB_HAUTEUR} px. Une autre forme est recadrée au centre.
          </span>
        </div>
        <div>
          <button className="btn btn-primary" type="submit">
            Créer la commande
          </button>
        </div>
      </form>

      {passees.length > 0 && (
        <>
          <h2>Terminées et annulées</h2>
          <ul className="small">
            {passees.map((pub) => (
              <li key={pub.id}>
                {numeroPub(pub.id)} · {pub.annonceur} · {lieu(pub)} ·{" "}
                {pub.etat === "annulee" ? "annulée" : `terminée le ${pub.finLe}`}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function lieu(pub: PubAdmin): string {
  return pub.emplacement === "accueil" ? "Accueil" : `Catégorie ${pub.categorie ?? "?"}`;
}

/** Même emplacement : l'accueil, ou la même catégorie. */
function memePlace(a: PubAdmin, b: PubAdmin): boolean {
  return a.emplacement === b.emplacement && a.categorie === b.categorie;
}

function ListePubs({ pubs, enPlace, enAttente }: { pubs: PubAdmin[]; enPlace: PubAdmin[]; enAttente: PubAdmin[] }) {
  return (
    <ul className="moderation">
      {pubs.map((pub) => {
        // Une commande en attente ne réserve pas la place : prévenir avant d'encaisser
        const occupant = pub.etat === "en_attente" ? enPlace.find((p) => memePlace(p, pub)) : undefined;
        const concurrentes = pub.etat === "en_attente" ? enAttente.filter((p) => p.id !== pub.id && memePlace(p, pub)) : [];
        return (
          <li key={pub.id} className="carte moderation-carte">
            <div className="moderation-tete">
              <h3>
                {numeroPub(pub.id)} · {pub.annonceur} · {prixXpf(pub.montantXpf)}
              </h3>
              <span className={`badge ${pub.etat === "en_place" ? "badge-ok" : "badge-attente"}`}>
                {pub.etat === "en_place" ? `En place jusqu'au ${pub.finLe}` : "En attente de paiement"}
              </span>
            </div>
            {pub.image && (
              // eslint-disable-next-line @next/next/no-img-element -- visuel déjà réduit par le serveur
              <img className="pub-visuel" src={pub.image} alt={pub.annonceur} width={PUB_LARGEUR} height={PUB_HAUTEUR} />
            )}
            <dl className="details details-nus small">
              <dt>Emplacement</dt>
              <dd>{lieu(pub)}</dd>
              <dt>Lien</dt>
              <dd>
                {pub.lien && (
                  <a className="link" href={pub.lien} target="_blank" rel="noopener noreferrer">
                    {pub.lien}
                  </a>
                )}
              </dd>
              <dt>Créée le</dt>
              <dd>{pub.creeeLe}</dd>
            </dl>
            {occupant && (
              <p className="avis avis-erreur small">
                <strong>
                  Emplacement occupé par {occupant.annonceur} jusqu&apos;au {occupant.finLe}. N&apos;encaissez pas ce paiement
                  avant cette date : l&apos;activation serait refusée.
                </strong>
              </p>
            )}
            {concurrentes.length > 0 && (
              <p className="avis small">
                Autre commande en attente pour cet emplacement : {concurrentes.map((p) => numeroPub(p.id)).join(", ")}. Une seule
                pourra être activée à la fois.
              </p>
            )}
            {pub.etat === "en_attente" ? (
              <form action={deciderPub} className="boutons">
                <input type="hidden" name="id" value={pub.id} />
                {!occupant && (
                  <button className="btn btn-petit btn-primary" type="submit" name="geste" value="activer">
                    {LIBELLE_GESTE_PUB.activer}
                  </button>
                )}
                <button className="btn btn-petit btn-secondary" type="submit" name="geste" value="annuler">
                  {LIBELLE_GESTE_PUB.annuler}
                </button>
              </form>
            ) : (
              // Retirer une pub payée ne se rattrape pas : case à cocher obligatoire
              <form action={deciderPub} className="boutons">
                <input type="hidden" name="id" value={pub.id} />
                <label className="small">
                  <input type="checkbox" name="confirmation" value="oui" required /> Je retire cette pub payée avant sa fin
                </label>
                <button className="btn btn-petit btn-secondary" type="submit" name="geste" value="retirer">
                  {LIBELLE_GESTE_PUB.retirer}
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const ERREURS: Record<string, string> = {
  confirmation: "Cochez la case pour confirmer le retrait de la pub.",
  occupe: "L'emplacement est déjà occupé par une pub en place. Attendez sa fin ou retirez-la avant d'activer.",
  annonceur: "Le nom de l'annonceur fait de 2 à 80 caractères.",
  emplacement: "Choisissez l'emplacement.",
  categorie: "Choisissez la catégorie de l'en-tête.",
  lien: "Indiquez un lien complet qui commence par https://",
  visuel: "Le visuel doit être une image JPEG lisible, de 4 Mo au plus.",
};

async function Message({ searchParams }: Pick<PageProps<"/admin/pubs">, "searchParams">) {
  const { fait, erreur } = await searchParams;
  if (typeof erreur === "string") {
    return (
      <div className="avis avis-erreur" role="alert">
        <p>
          <strong>{ERREURS[erreur] ?? "L'opération n'a pas pu être enregistrée. Rechargez la page et réessayez."}</strong>
        </p>
      </div>
    );
  }
  const geste = lireGestePub(fait);
  const texte = fait === "creee" ? "Commande créée, en attente de paiement." : geste ? CONFIRMATION_PUB[geste] : null;
  if (!texte) return null;
  return (
    <div className="avis" role="status">
      <p>
        <strong>{texte}</strong>
      </p>
    </div>
  );
}
