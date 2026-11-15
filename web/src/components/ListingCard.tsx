import Link from "next/link";
import { getCategory, type Listing } from "@/lib/data";
import { prixXpf } from "@/lib/format";
import { Icon } from "./Icon";

/** Ligne d'annonce : toute la carte est un lien vers la page de l'annonce. */
export function ListingCard({ annonce }: { annonce: Listing }) {
  const categorie = getCategory(annonce.categorie);
  return (
    <Link className="annonce" href={`/annonces/${annonce.id}`}>
      <div className="photo">
        {categorie && <Icon name={categorie.icone} />}
        {annonce.boost && <span className="badge badge-boost">Boost</span>}
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
