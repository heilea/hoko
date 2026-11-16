import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage({ searchParams }: PageProps<"/connexion">) {
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

            {/* Retour d'un lien reçu par e-mail qui n'a pas fonctionné */}
            <Suspense fallback={null}>
              <MessageLien searchParams={searchParams} />
            </Suspense>

            <LoginForm />

            <p className="small muted">
              <Link className="link" href="/mot-de-passe">
                Mot de passe oublié ?
              </Link>
            </p>
            <p className="small muted">
              Pas encore de compte ?{" "}
              <Link className="link" href="/inscription">
                Créer un compte
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

async function MessageLien({ searchParams }: Pick<PageProps<"/connexion">, "searchParams">) {
  const { erreur } = await searchParams;
  if (erreur !== "lien") return null;
  return (
    <div className="avis avis-erreur" role="alert">
      <p>
        <strong>Ce lien a expiré ou a déjà servi.</strong>
      </p>
      <p className="small">
        Si vous venez de confirmer votre adresse, essayez de vous connecter. Sinon, demandez un nouveau lien depuis « Mot de
        passe oublié ».
      </p>
    </div>
  );
}
