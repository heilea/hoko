import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration Hoko" },
  robots: { index: false },
};

// Espace privé : la page attend la session côté serveur, sans chercher la navigation instantanée
export const instant = false;

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main>
      <section className="band">
        <div className="wrap">
          <Suspense
            fallback={
              <p className="muted" role="status">
                Chargement…
              </p>
            }
          >
            <Garde>{children}</Garde>
          </Suspense>
        </div>
      </section>
    </main>
  );
}

/**
 * Réserve l'espace à l'administrateur. Un visiteur va à la connexion ; un compte qui n'est pas
 * administrateur reçoit « page introuvable », sans apprendre que l'espace existe.
 * La base vérifie aussi le rôle à chaque décision : cette garde ne suffit pas à elle seule.
 */
async function Garde({ children }: { children: React.ReactNode }) {
  const compte = await getSession();
  if (!compte) redirect("/connexion");
  if (!compte.admin) notFound();
  return (
    <div className="stack">
      <nav className="boutons small" aria-label="Administration">
        <Link className="link" href="/admin">
          Annonces à valider
        </Link>
        <Link className="link" href="/admin/vitrines">
          Vitrines
        </Link>
        <Link className="link" href="/compte">
          Mon compte
        </Link>
      </nav>
      {children}
    </div>
  );
}
