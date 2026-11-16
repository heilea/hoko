/**
 * Page où renvoyer quelqu'un après un lien reçu par e-mail.
 * Seules les adresses internes au site sont acceptées : un lien piégé ne peut pas renvoyer
 * vers un autre site (« //exemple.com », « https://… », « /\exemple.com »).
 */
export function cheminDeRetour(suite: string | null | undefined, parDefaut = "/compte"): string {
  if (!suite || !/^\/(?![/\\])[^\s\\]*$/.test(suite)) return parDefaut;
  return suite;
}
