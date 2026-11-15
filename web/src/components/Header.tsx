import Link from "next/link";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
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
            {/* Le lien dépend de la session, connue seulement à la requête */}
            <Suspense fallback={<LienConnexion />}>
              <LienCompte />
            </Suspense>
            <Link className="btn btn-primary" href="/publier">
              Publier
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function LienConnexion() {
  return (
    <Link className="btn btn-secondary" href="/connexion">
      Connexion
    </Link>
  );
}

async function LienCompte() {
  const compte = await getSession();
  if (!compte) return <LienConnexion />;
  return (
    <Link className="btn btn-secondary" href="/compte">
      Mon compte
    </Link>
  );
}
