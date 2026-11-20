import Link from "next/link";
import type { Category } from "@/lib/data";
import { prixXpf } from "@/lib/format";
import { PUB_HAUTEUR, PUB_LARGEUR } from "@/lib/pubs";
import { getPubsEnPlace, getPubTarifs } from "@/lib/pubs-donnees";

/**
 * Espace pub de l'accueil ou de l'en-tête d'une catégorie (SPEC.md, 3 ter).
 * Une pub en place : son visuel, avec la mention « Publicité », lien marqué « sponsorisé ».
 * Sinon : « Votre publicité ici », avec le prix et un lien vers /publicite.
 */
export async function EspacePub({ categorie }: { categorie?: Category }) {
  const [pubs, tarifs] = await Promise.all([getPubsEnPlace(), getPubTarifs()]);
  const pub = categorie ? pubs.categories[categorie.slug] : pubs.accueil;

  if (pub) {
    return (
      <a className="pub" href={pub.lien} target="_blank" rel="sponsored noopener noreferrer">
        <span className="label pub-mention">Publicité</span>
        {/* eslint-disable-next-line @next/next/no-img-element -- visuel déjà recadré et compressé par le serveur */}
        <img src={pub.image} alt={pub.annonceur} width={PUB_LARGEUR} height={PUB_HAUTEUR} />
      </a>
    );
  }

  const prix = categorie ? tarifs.categorie : tarifs.accueil;
  if (categorie) {
    return (
      <div className="panneau panneau-compact">
        <div>
          <span className="label">Publicité</span>
          <strong>Votre publicité en {categorie.nom}</strong>
          <p>
            L&apos;espace réservé à cette catégorie.
            {prix && (
              <>
                {" "}
                <span className="prix">{prixXpf(prix)}</span> pour 30 jours.
              </>
            )}
          </p>
        </div>
        <Link className="btn btn-sombre" href="/publicite">
          Réserver
        </Link>
      </div>
    );
  }
  return (
    <div className="panneau">
      <span className="label">Publicité</span>
      <strong>Votre publicité ici</strong>
      <p>
        Le premier espace de la page.
        {prix && (
          <>
            {" "}
            <span className="prix">{prixXpf(prix)}</span> pour 30 jours.
          </>
        )}
      </p>
      <Link className="btn btn-sombre" href="/publicite">
        Réserver
      </Link>
    </div>
  );
}
