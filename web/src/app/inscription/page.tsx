import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignupForm } from "@/components/SignupForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignupPage() {
  return (
    <main>
      <section className="band">
        <div className="wrap">
          <div className="connexion">
            <div className="fiche-titre">
              <h1>Créer un compte</h1>
              <p className="muted">Gratuit pour publier vos annonces. Pour acheter, aucun compte n&apos;est nécessaire.</p>
            </div>

            {/* Un annonceur déjà connecté va directement à son espace */}
            <Suspense fallback={null}>
              <DejaConnecte />
            </Suspense>

            <SignupForm />

            <p className="small muted">
              Déjà un compte ?{" "}
              <Link className="link" href="/connexion">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

async function DejaConnecte() {
  if (await getSession()) redirect("/compte");
  return null;
}
