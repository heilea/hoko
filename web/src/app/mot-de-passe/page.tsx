import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Mot de passe oublié", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <main>
      <section className="band">
        <div className="wrap">
          <div className="connexion">
            <div className="fiche-titre">
              <h1>Mot de passe oublié</h1>
              <p className="muted">Recevez par e-mail un lien pour en choisir un nouveau.</p>
            </div>
            <ForgotPasswordForm />
            <p className="small muted">
              <Link className="link" href="/connexion">
                Revenir à la connexion
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
