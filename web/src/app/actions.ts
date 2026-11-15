"use server";

import { getListingPhone, getProPhone } from "@/lib/data";
import { validerAnnonce, type AnnonceSaisie, type AnnonceValide, type ChampAnnonce } from "@/lib/validation";

export type EtatDepot =
  | { statut: "initial" }
  | { statut: "erreurs"; erreurs: Partial<Record<ChampAnnonce, string>>; saisie: AnnonceSaisie }
  | { statut: "valide"; annonce: AnnonceValide };

/**
 * Reçoit le formulaire de dépôt d'annonce et le vérifie côté serveur.
 *
 * Tant qu'il n'y a ni base de données ni comptes, l'annonce valide n'est PAS enregistrée :
 * elle est renvoyée telle quelle pour l'aperçu, et la page le dit clairement.
 * À faire ensuite : exiger un compte, enregistrer l'annonce avec le statut « en attente de
 * validation » (l'administrateur valide les annonces, SPEC.md), puis recevoir les photos.
 */
export async function soumettreAnnonce(_precedent: EtatDepot, formulaire: FormData): Promise<EtatDepot> {
  const texte = (champ: string) => {
    const valeur = formulaire.get(champ);
    return typeof valeur === "string" ? valeur.slice(0, 5000) : "";
  };
  const saisie: AnnonceSaisie = {
    titre: texte("titre"),
    categorie: texte("categorie"),
    prix: texte("prix"),
    description: texte("description"),
    ile: texte("ile"),
    commune: texte("commune"),
    telephone: texte("telephone"),
    accord: formulaire.get("accord") === "on",
  };
  const resultat = validerAnnonce(saisie);
  if (!resultat.ok) return { statut: "erreurs", erreurs: resultat.erreurs, saisie };
  return { statut: "valide", annonce: resultat.annonce };
}

export type CibleContact = { type: "annonce" | "pro"; id: string };

/**
 * Donne le numéro à appeler quand un visiteur clique sur « Voir le numéro »,
 * sur une annonce ou sur la vitrine d'un pro.
 * Le numéro ne figure jamais dans la page : il n'est envoyé qu'à cette demande.
 *
 * À faire avec la base de données : enregistrer chaque appel dans `contact_reveals`
 * (statistique « contacts reçus ») et limiter le nombre de demandes par visiteur.
 */
export async function revealPhone(cible: CibleContact): Promise<string | null> {
  if (!cible || typeof cible.id !== "string" || cible.id.length > 60) return null;
  if (cible.type === "annonce") return getListingPhone(cible.id) ?? null;
  if (cible.type === "pro") return getProPhone(cible.id) ?? null;
  return null;
}
