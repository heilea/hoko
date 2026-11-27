/**
 * Reconnaître un visiteur sans compte, pour la limite de « Voir le numéro » (SPEC.md, section 4,
 * point 7) : 20 numéros par heure et par visiteur, 300 par heure et par adresse IP.
 *
 * Le visiteur est reconnu par un cookie signé par le serveur (`hoko_v`), posé sur les pages qui
 * ont un bouton « Voir le numéro ». L'adresse IP seule ne suffit pas : les abonnés mobiles de
 * Vini et d'Onati partagent souvent la même. Un cookie mal signé ou absent compte comme « sans
 * cookie » : tous ces visiteurs d'une même adresse partagent alors une seule limite de 20.
 *
 * La base ne reçoit que des empreintes (HMAC) : jamais l'adresse ni le cookie en clair.
 * Web Crypto seulement, pour fonctionner aussi bien dans le proxy que dans une action serveur.
 */

export const COOKIE_VISITEUR = "hoko_v";
/** Un an : le cookie ne contient qu'un identifiant au hasard, rien sur la personne. */
export const DUREE_COOKIE_VISITEUR = 60 * 60 * 24 * 365;

export function optionsCookieVisiteur() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DUREE_COOKIE_VISITEUR,
  };
}

type Entetes = { get(nom: string): string | null };

function base64url(octets: ArrayBuffer): string {
  let texte = "";
  for (const octet of new Uint8Array(octets)) texte += String.fromCharCode(octet);
  return btoa(texte).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, texte: string): Promise<string> {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return base64url(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(texte)));
}

/** Comparaison en temps constant, pour ne pas laisser deviner une signature octet par octet. */
function egales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let ecart = 0;
  for (let i = 0; i < a.length; i++) ecart |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return ecart === 0;
}

/** Empreinte envoyée à la base (32 caractères) : on ne peut pas remonter à la valeur d'origine. */
export async function empreinte(secret: string, genre: "visiteur" | "adresse" | "email", valeur: string): Promise<string> {
  return (await hmac(secret, `${genre}:${valeur}`)).slice(0, 32);
}

export async function creerCookieVisiteur(secret: string): Promise<string> {
  const id = crypto.randomUUID();
  return `${id}.${(await hmac(secret, `cookie:${id}`)).slice(0, 22)}`;
}

/** Identifiant du visiteur si le cookie est bien signé par le serveur, sinon null. */
export async function lireCookieVisiteur(secret: string, valeur: string | undefined | null): Promise<string | null> {
  if (typeof valeur !== "string" || valeur.length > 80) return null;
  const [id, signature, ...reste] = valeur.split(".");
  if (reste.length || !id || !signature || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return egales(signature, (await hmac(secret, `cookie:${id}`)).slice(0, 22)) ? id : null;
}

/**
 * Adresse IP du visiteur. Sur Vercel, `x-forwarded-for` est réécrit par la plateforme : le
 * visiteur ne peut pas la falsifier. La première adresse de la liste est la sienne.
 */
export function adresseClient(entetes: Entetes): string {
  const transmise = entetes.get("x-forwarded-for")?.split(",")[0]?.trim();
  const adresse = transmise || entetes.get("x-real-ip")?.trim();
  return adresse ? adresse.slice(0, 64) : "inconnue";
}

/** Pages où le bouton « Voir le numéro » peut apparaître : le cookie n'est posé que là. */
export function pageAvecNumero(chemin: string): boolean {
  return /^\/(annonces|pros)\/[^/]+\/?$/.test(chemin);
}
