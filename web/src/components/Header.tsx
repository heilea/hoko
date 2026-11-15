import Link from "next/link";
import { Icon } from "./Icon";

export function Header() {
  return (
    <header className="topbar">
      <div className="wrap">
        <Link className="logo" href="/" aria-label="Hoko, accueil">
          hoko<span>.</span>
        </Link>
        <div className="droite">
          {/* Formulaire GET : la recherche fonctionne même sans JavaScript */}
          <form className="search" action="/" method="get" role="search">
            <input
              id="q"
              name="q"
              type="search"
              placeholder="Rechercher"
              aria-label="Rechercher une annonce"
              autoComplete="off"
            />
            <button type="submit" aria-label="Rechercher">
              <Icon name="loupe" />
            </button>
          </form>
          <div className="actions">
            <Link className="btn btn-secondary" href="/connexion">
              Connexion
            </Link>
            <Link className="btn btn-primary" href="/publier">
              Publier
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
