import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountNav } from "@/components/AccountNav";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: { default: "Mon compte", template: "%s · Hoko" },
  robots: { index: false },
};

// Espace privé : la page attend la session côté serveur, sans chercher la navigation instantanée
export const instant = false;

export default function AccountLayout({ children }: LayoutProps<"/compte">) {
  return (
    <main>
      <section className="band">
        <div className="wrap">
          {/* La session se lit à la requête : tout l'espace annonceur attend sous ce Suspense */}
          <Suspense
            fallback={
              <p className="muted" role="status">
                Chargement de votre espace…
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

/** Réserve l'espace aux annonceurs connectés : sinon, retour à la page de connexion. */
async function Garde({ children }: { children: React.ReactNode }) {
  const compte = await getSession();
  if (!compte) redirect("/connexion");
  return (
    <div className="compte">
      <div className="compte-cote">
        <div className="compte-qui">
          <strong>{compte.nom}</strong>
          <span className="small muted">{compte.type === "pro" ? "Compte professionnel" : "Compte particulier"}</span>
        </div>
        <AccountNav admin={compte.admin} />
      </div>
      <div className="stack compte-contenu">{children}</div>
    </div>
  );
}
