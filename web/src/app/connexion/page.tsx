import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { getComptesDemo } from "@/lib/accounts";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  const demo = getComptesDemo();
  return (
    <main>
      <section className="band">
        <div className="wrap">
          <div className="connexion">
            <div className="fiche-titre">
              <h1>Connexion</h1>
              <p className="muted">Retrouvez vos annonces et votre vitrine.</p>
            </div>

            {/* Un annonceur déjà connecté va directement à son espace */}
            <Suspense fallback={null}>
              <DejaConnecte />
            </Suspense>

            <LoginForm />

            <p className="small muted">
              Pas encore de compte ?{" "}
              <Link className="link" href="/inscription">
                Créer un compte
              </Link>
            </p>

            <div className="avis">
              <p>
                <strong>Version de démonstration</strong>
              </p>
              <p className="small">Deux comptes d&apos;exemple permettent de visiter l&apos;espace annonceur :</p>
              <ul className="demo small">
                {demo.map((compte) => (
                  <li key={compte.email}>
                    {compte.type === "pro" ? "Professionnel" : "Particulier"} : <code>{compte.email}</code>, mot de passe{" "}
                    <code>{compte.motDePasse}</code>
                  </li>
                ))}
              </ul>
            </div>
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
