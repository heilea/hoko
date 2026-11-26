"use server";

/**
 * Signaler une annonce (SPEC.md, section 4 septies) : envoi par un visiteur sans compte,
 * traitement par l'administrateur. Les règles (annonce en ligne, limites, rôle) sont vérifiées
 * par la base ; les vérifications d'ici servent à répondre clairement.
 */
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAG_ANNONCES } from "@/lib/annonces-donnees";
import { getSession } from "@/lib/session";
import { enregistrerSignalement } from "@/lib/signaler";
import { lireGesteSignalement, messageErreurTraitement, type ReponseSignalement } from "@/lib/signalements";
import { creerClientServeur } from "@/lib/supabase-serveur";

/** Le visiteur signale une annonce en ligne. */
export async function signalerAnnonce(annonceId: string, motif: string, details: string): Promise<ReponseSignalement> {
  return enregistrerSignalement(annonceId, motif, details);
}

export type EtatTraitement = { erreur?: string; motif?: string };

/** L'administrateur retire l'annonce signalée, ou classe ses signalements sans suite. */
export async function traiterSignalements(_precedent: EtatTraitement, formulaire: FormData): Promise<EtatTraitement> {
  const valeurId = formulaire.get("id");
  const id = Number(typeof valeurId === "string" ? valeurId.slice(0, 20) : NaN);
  const geste = lireGesteSignalement(formulaire.get("geste"));
  const valeurMotif = formulaire.get("motif");
  const motif = typeof valeurMotif === "string" ? valeurMotif.slice(0, 2000) : "";

  const compte = await getSession();
  if (!compte?.admin) return { erreur: messageErreurTraitement("42501", undefined), motif };
  if (!Number.isSafeInteger(id) || id <= 0 || !geste) return { erreur: messageErreurTraitement(undefined, undefined), motif };
  const net = motif.trim();
  if (geste === "retirer" && (net.length < 5 || net.length > 500)) {
    return { erreur: messageErreurTraitement(undefined, "motif"), motif };
  }

  const supabase = await creerClientServeur();
  if (!supabase) return { erreur: messageErreurTraitement(undefined, undefined), motif };
  const { error } = await supabase.rpc("traiter_signalements", {
    annonce_id: id,
    geste,
    ...(geste === "retirer" ? { motif: net } : {}),
  });
  if (error) {
    if (!error.hint) console.error("Traitement refusé par la base :", error.code);
    return { erreur: messageErreurTraitement(error.code, error.hint), motif };
  }
  // Une annonce retirée quitte aussitôt les pages publiques
  if (geste === "retirer") updateTag(TAG_ANNONCES);
  redirect(`/admin/signalements?fait=${geste}`);
}
