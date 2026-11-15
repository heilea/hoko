/**
 * Session de l'annonceur connecté, lue dans un cookie signé.
 * À n'appeler que côté serveur, sous un <Suspense> (la lecture du cookie se fait à la requête).
 */
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getAccount, type Account } from "./accounts";
import { creerJeton, DUREE_SESSION_MS, lireJeton } from "./session-token";

const COOKIE = "hoko_session";

/**
 * Secret qui signe les sessions. En production, il doit venir de la variable
 * d'environnement SESSION_SECRET : sans elle, la connexion est désactivée plutôt que
 * de signer avec un secret connu de tous.
 */
function secret(): string | null {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") return null;
  return "secret-de-developpement-hoko-non-securise";
}

export function connexionDisponible(): boolean {
  return secret() !== null;
}

/** Le compte connecté, ou null. */
export async function getSession(): Promise<Account | null> {
  // Le cookie est lu en premier, avant tout retour : c'est cette lecture qui indique à Next.js
  // que la page dépend de la requête. Sans elle, la page serait figée à la construction du site.
  const jeton = (await cookies()).get(COOKIE)?.value;
  const cle = secret();
  if (!cle || !jeton) return null;
  // L'heure courante sert à vérifier l'expiration : on attend la requête avant de la lire
  await connection();
  return getAccount(lireJeton(jeton, cle, Date.now()));
}

export async function ouvrirSession(compteId: string): Promise<boolean> {
  const cle = secret();
  if (!cle) return false;
  (await cookies()).set(COOKIE, creerJeton(compteId, cle, Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DUREE_SESSION_MS / 1000,
  });
  return true;
}

export async function fermerSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
