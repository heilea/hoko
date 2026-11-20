/**
 * Renouvelle la session Supabase avant chaque page.
 *
 * Le jeton d'accès d'une session dure une heure. Les composants serveur ne peuvent pas réécrire
 * les cookies : sans ce renouvellement, un annonceur paraîtrait déconnecté au bout d'une heure.
 *
 * Pose aussi, sur les pages d'annonce et de vitrine, le cookie signé qui reconnaît le visiteur
 * pour la limite de « Voir le numéro » (voir `lib/visiteur.ts`).
 *
 * Ce n'est PAS une protection : chaque page et chaque action serveur vérifient elles-mêmes la
 * session (voir `getSession`).
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./lib/database.types";
import { COOKIE_VISITEUR, creerCookieVisiteur, lireCookieVisiteur, optionsCookieVisiteur, pageAvecNumero } from "./lib/visiteur";

export async function proxy(request: NextRequest) {
  const reponse = await renouvelerSession(request);
  await poserCookieVisiteur(request, reponse);
  return reponse;
}

async function poserCookieVisiteur(request: NextRequest, reponse: NextResponse) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret || !pageAvecNumero(request.nextUrl.pathname)) return;
  if (await lireCookieVisiteur(secret, request.cookies.get(COOKIE_VISITEUR)?.value)) return;
  reponse.cookies.set(COOKIE_VISITEUR, await creerCookieVisiteur(secret), optionsCookieVisiteur());
}

async function renouvelerSession(request: NextRequest): Promise<NextResponse> {
  let reponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Sans Supabase ou sans cookie de session, rien à renouveler : pas d'appel réseau
  if (!url || !cle || !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return reponse;

  const supabase = createServerClient<Database>(url, cle, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(aEcrire, entetes) {
        for (const { name, value } of aEcrire) request.cookies.set(name, value);
        reponse = NextResponse.next({ request });
        for (const { name, value, options } of aEcrire) reponse.cookies.set(name, value, options);
        // En-têtes qui empêchent la mise en cache d'une réponse portant des cookies de session
        for (const [nom, valeur] of Object.entries(entetes ?? {})) reponse.headers.set(nom, valeur);
      },
    },
  });

  // Vérifie le jeton et le renouvelle s'il a expiré
  await supabase.auth.getClaims();
  return reponse;
}

export const config = {
  // Ni les fichiers du site (scripts, polices, images) ni l'icône
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)"],
};
