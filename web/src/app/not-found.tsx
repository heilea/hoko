import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="vide">
        <span className="label muted">Page introuvable</span>
        <h1>Cette page n&apos;existe pas ou plus</h1>
        <p className="muted">L&apos;annonce a peut-être été retirée par son vendeur.</p>
        <Link className="btn btn-primary" href="/">
          Voir les annonces
        </Link>
      </div>
    </main>
  );
}
