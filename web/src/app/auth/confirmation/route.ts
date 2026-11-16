/**
 * Arrivée depuis un lien reçu par e-mail : confirmation de l'adresse, ou nouveau mot de passe.
 * Ouvre la session, puis renvoie vers la page indiquée par `suite`.
 */
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { cheminDeRetour } from "@/lib/redirection";
import { creerClientServeur } from "@/lib/supabase-serveur";

const TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

export async function GET(request: NextRequest) {
  const parametres = request.nextUrl.searchParams;
  const suite = cheminDeRetour(parametres.get("suite"));
  const supabase = await creerClientServeur();

  if (supabase) {
    const code = parametres.get("code");
    const jeton = parametres.get("token_hash");
    const type = parametres.get("type") as EmailOtpType | null;

    // `code` : lien ouvert dans le navigateur qui a fait la demande.
    // `token_hash` : lien qui marche depuis n'importe quel appareil (modèle d'e-mail adapté).
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : jeton && type && TYPES.includes(type)
        ? await supabase.auth.verifyOtp({ type, token_hash: jeton })
        : { error: true };

    if (!error) return NextResponse.redirect(new URL(suite, request.url));
  }

  return NextResponse.redirect(new URL("/connexion?erreur=lien", request.url));
}
