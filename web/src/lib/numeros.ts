/**
 * « Voir le numéro », côté serveur seulement (SPEC.md, section 4, point 7).
 *
 * Les fonctions `voir_numero_annonce` et `voir_numero_vitrine` ne sont plus ouvertes à la clé
 * publique : seul ce serveur peut les appeler, avec la clé secrète. Ainsi personne ne contourne
 * la limite de 20 numéros par heure et par visiteur, comptée par la base (`numero_demandes`).
 */
import { idAnnonceValide } from "./annonces";
import { serveurVisiteur } from "./visiteur-serveur";

export type CibleContact = { type: "annonce" | "pro"; id: string };
export type ReponseNumero = { numero: string } | { erreur: "limite" | "introuvable" | "indisponible" };

export async function demanderNumero(cible: CibleContact): Promise<ReponseNumero> {
  if (!cible || typeof cible.id !== "string") return { erreur: "introuvable" };
  const annonce = cible.type === "annonce" && idAnnonceValide(cible.id);
  const vitrine = cible.type === "pro" && /^[a-z0-9-]{1,80}$/.test(cible.id);
  if (!annonce && !vitrine) return { erreur: "introuvable" };

  const serveur = await serveurVisiteur();
  if (!serveur) return { erreur: "indisponible" };
  const { supabase, visiteur, adresse } = serveur;
  const { data, error } = annonce
    ? await supabase.rpc("voir_numero_annonce", { annonce_id: Number(cible.id), visiteur, adresse })
    : await supabase.rpc("voir_numero_vitrine", { vitrine_slug: cible.id, visiteur, adresse });
  if (error) {
    if (error.hint === "limite") return { erreur: "limite" };
    console.error("Numéro refusé par la base :", error.code);
    return { erreur: "indisponible" };
  }
  return data ? { numero: data } : { erreur: "introuvable" };
}
