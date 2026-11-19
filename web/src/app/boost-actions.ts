"use server";

/**
 * Boost d'une annonce de particulier (SPEC.md, section 1) : commande et annulation par le
 * particulier, activation ou annulation par l'administrateur à réception du paiement.
 * Toutes les règles (places, limites, annonce en ligne, rôle) sont vérifiées par la base.
 *
 * Paiement par carte (à venir) : passerelle à choisir entre OSB (PayZen) et NiuPay, frais
 * demandés aux deux. Une fois le contrat signé, `commanderBoost` enverra vers la page de
 * paiement de la passerelle avec le numéro de commande, et le retour de paiement confirmé
 * (notification signée de la passerelle, vérifiée côté serveur) activera le boost comme le
 * geste « activer » de l'administrateur. Ne jamais activer sur la seule foi du navigateur.
 */
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG_ANNONCES } from "@/lib/annonces-donnees";
import { lireGesteBoost } from "@/lib/boost";
import { getSession } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase-serveur";

function idValide(valeur: FormDataEntryValue | null): number | null {
  const id = Number(typeof valeur === "string" ? valeur.slice(0, 20) : NaN);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Le particulier commande un boost pour une de ses annonces en ligne. */
export async function commanderBoost(formulaire: FormData): Promise<void> {
  const compte = await getSession();
  if (!compte) redirect("/connexion");
  const id = idValide(formulaire.get("id"));
  if (!id || compte.type !== "particulier") redirect("/compte/annonces");
  const page = `/compte/annonces/${id}/booster`;

  const supabase = await creerClientServeur();
  if (!supabase) redirect(`${page}?erreur=indisponible`);
  const { data, error } = await supabase.rpc("commander_boost", { annonce_id: id });
  if (error || !data?.[0]) {
    console.error("Commande de boost refusée par la base :", error?.code, error?.hint);
    const motif =
      error?.hint === "pas_en_ligne" || error?.hint === "deja" ? error.hint : error?.code === "42501" ? "reserve" : "indisponible";
    redirect(`${page}?erreur=${motif}`);
  }
  redirect(`${page}?resultat=${data[0].statut}`);
}

/** Le particulier annule sa commande tant qu'elle n'est pas payée. */
export async function annulerBoost(formulaire: FormData): Promise<void> {
  const compte = await getSession();
  if (!compte) redirect("/connexion");
  const annonce = idValide(formulaire.get("annonce"));
  const commande = idValide(formulaire.get("commande"));
  if (!annonce || !commande) redirect("/compte/annonces");
  const page = `/compte/annonces/${annonce}/booster`;

  const supabase = await creerClientServeur();
  if (!supabase) redirect(`${page}?erreur=indisponible`);
  const { error } = await supabase.rpc("annuler_boost", { boost_id: commande });
  if (error) {
    console.error("Annulation de boost refusée par la base :", error.code);
    redirect(`${page}?erreur=annulation`);
  }
  redirect(`${page}?resultat=annulee`);
}

/** L'administrateur active un boost (paiement reçu) ou annule une commande non payée. */
export async function deciderBoost(formulaire: FormData): Promise<void> {
  const compte = await getSession();
  if (!compte?.admin) redirect("/connexion");
  const id = idValide(formulaire.get("id"));
  const geste = lireGesteBoost(formulaire.get("geste"));
  if (!id || !geste) redirect("/admin/boosts?erreur=1");

  const supabase = await creerClientServeur();
  if (!supabase) redirect("/admin/boosts?erreur=1");
  const { error } = await supabase.rpc("decider_boost", { boost_id: id, geste });
  if (error) {
    console.error("Décision sur le boost refusée par la base :", error.code, error.hint);
    redirect(`/admin/boosts?erreur=${error.hint === "pas_en_ligne" ? "pas_en_ligne" : "1"}`);
  }
  // Les pages de catégorie remontent aussitôt l'annonce boostée
  updateTag(TAG_ANNONCES);
  redirect(`/admin/boosts?fait=${geste}`);
}
