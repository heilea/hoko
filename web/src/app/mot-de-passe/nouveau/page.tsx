import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewPasswordForm } from "@/components/NewPasswordForm";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default function NewPasswordPage() {
  return (
    <main>
      <section className="band">
        <div className="wrap">
          <div className="connexion">
            <div className="fiche-titre">
              <h1>Nouveau mot de passe</h1>
            </div>
            {/* Le lien reçu par e-mail a ouvert une session : elle se lit à la requête */}
            <Suspense
              fallback={
                <p className="muted" role="status">
                  Chargement…
                </p>
              }
            >
              <Formulaire />
            </Suspense>
          </div>
        </div>
      </section>
    </main>
  );
}

async function Formulaire() {
  if (!(await getSession())) {
    return (
      <div className="avis avis-erreur" role="alert">
        <p>
          <strong>Ce lien a expiré ou a déjà servi.</strong>
        </p>
        <p>
          <Link className="link" href="/mot-de-passe">
            Demander un nouveau lien
          </Link>
        </p>
      </div>
    );
  }
  return <NewPasswordForm />;
}
