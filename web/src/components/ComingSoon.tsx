import Link from "next/link";

/** Page pas encore construite : on le dit clairement plutôt que de laisser un lien mort. */
export function ComingSoon({ titre, texte }: { titre: string; texte: string }) {
  return (
    <main className="wrap">
      <div className="vide">
        <span className="label muted">Bientôt</span>
        <h1>{titre}</h1>
        <p className="muted">{texte}</p>
        <Link className="btn btn-secondary" href="/">
          Revenir à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
