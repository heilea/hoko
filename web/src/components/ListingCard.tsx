import Link from "next/link";
import { getCategory, type Listing } from "@/lib/data";
import { prixXpf } from "@/lib/format";
import { Icon } from "./Icon";

/**
 * Ligne d'annonce : toute la carte est un lien vers la page de l'annonce.
 * `sansBoost` masque le badge « Boost » : sur l'accueil, le boost ne se voit pas et ne change
 * pas l'ordre, il ne joue que dans la catégorie de l'annonce.
 */
export function ListingCard({ annonce, sansBoost = false }: { annonce: Listing; sansBoost?: boolean }) {
  const categorie = getCategory(annonce.categorie);
  return (
    <Link className="annonce" href={`/annonces/${annonce.id}`}>
      <div className="photo">
        {categorie && <Icon name={categorie.icone} />}
        {annonce.boost && !sansBoost && <span className="badge badge-boost">Boost</span>}
      </div>
      <div className="corps">
        <h3>{annonce.titre}</h3>
        <span className="price">
          {prixXpf(annonce.prixXpf)}
          {annonce.suffixePrix}
        </span>
        <span className="small muted lieu">
          <Icon name="lieu" />
          {annonce.commune}, {annonce.ile} · {annonce.publiee}
        </span>
      </div>
    </Link>
  );
}
