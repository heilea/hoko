import Link from "next/link";
import { lienPage, numerosAffiches } from "@/lib/pagination";

/**
 * Liens « Précédent », « 1 2 3 … », « Suivant » sous une liste d'annonces.
 * Rien n'est affiché s'il n'y a qu'une page ; « Précédent » et « Suivant » seulement s'il y a
 * une page avant ou après.
 */
export function Pagination({ chemin, page, pages, q }: { chemin: string; page: number; pages: number; q?: string }) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pages d'annonces">
      {page > 1 && (
        <Link className="page-lien" href={lienPage(chemin, page - 1, q)} rel="prev">
          Précédent
        </Link>
      )}
      {numerosAffiches(page, pages).map((n, rang) =>
        n === "…" ? (
          <span key={`trou-${rang}`} className="page-trou" aria-hidden="true">
            …
          </span>
        ) : n === page ? (
          <span key={n} className="page-lien page-active" aria-current="page">
            {n}
          </span>
        ) : (
          <Link key={n} className="page-lien" href={lienPage(chemin, n, q)} aria-label={`Page ${n}`}>
            {n}
          </Link>
        ),
      )}
      {page < pages && (
        <Link className="page-lien" href={lienPage(chemin, page + 1, q)} rel="next">
          Suivant
        </Link>
      )}
    </nav>
  );
}
