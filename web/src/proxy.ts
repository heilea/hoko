/**
 * Renouvelle la session Supabase avant chaque page.
 *
 * Le jeton d'accès d'une session dure une heure. Les composants serveur ne peuvent pas réécrire
 * les cookies : sans ce renouvellement, un annonceur paraîtrait déconnecté au bout d'une heure.
 *
 * Ce n'est PAS une protection : chaque page et chaque action serveur vérifient elles-mêmes la
 * session (voir `getSession`).
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let reponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Sans Supabase ou sans cookie de session, rien à renouveler : pas d'appel réseau
  if (!url || !cle || !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return reponse;

  const supabase = createServerClient(url, cle, {
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
