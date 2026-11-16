import Link from "next/link";
import { getVerifiedPros } from "@/lib/annonces-donnees";
import type { Category } from "@/lib/data";
import { prixXpf, sigle } from "@/lib/format";
import { Icon } from "./Icon";

/**
 * Annuaire des pros : la porte vers le marketplace dédié aux professionnels.
 * Sur la page d'une catégorie, il met en avant les pros de cette catégorie.
 */
export async function ProDirectory({ categorie }: { categorie?: Category }) {
  const pros = await getVerifiedPros(categorie?.slug);
  const duSecteur = Boolean(categorie) && pros.every((pro) => pro.categorie === categorie?.slug);
  return (
    <aside className="porte" aria-label="Annuaire des pros">
      <div className="porte-tete">
        <span className="label">Marketplace pro</span>
        <h2>{duSecteur ? `Pros en ${categorie?.nom}` : "Annuaire des pros"}</h2>
      </div>
      {pros.length === 0 && <p className="small muted">Les premiers pros vérifiés apparaîtront ici.</p>}
      <ul>
        {pros.map((pro) => (
          <li key={pro.slug}>
            <Link className="pro" href={`/pros/${pro.slug}`}>
              <span className="sigle" aria-hidden="true">
                {sigle(pro.nom)}
              </span>
              <span>
                <strong>{pro.nom}</strong>
                <span className="small muted">
                  {pro.secteur} · {pro.ile}
                </span>
              </span>
              <Icon name="fleche" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="porte-pied">
        <Link className="btn btn-primary btn-block" href="/pros">
          Entrer chez les pros <Icon name="fleche" />
        </Link>
        <p className="small muted">
          Des vitrines vérifiées, à part des annonces de particuliers. Vous êtes pro ? Vitrine et 20 annonces pour{" "}
          <strong>{prixXpf(10000)}</strong> par mois.{" "}
          <Link className="link" href="/pros#ouvrir">
            Ouvrir ma vitrine
          </Link>
        </p>
      </div>
    </aside>
  );
}
