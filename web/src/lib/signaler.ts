/**
 * « Signaler cette annonce », côté serveur seulement (SPEC.md, section 4 septies).
 *
 * La fonction `signaler_annonce` n'est ouverte qu'à la clé secrète : seul ce serveur peut
 * enregistrer un signalement, avec les empreintes du visiteur. La base refuse un second
 * signalement de la même annonce par le même visiteur, et plus de 5 par heure.
 */
import { idAnnonceValide } from "./annonces";
import { messageRefusSignalement, verifierSignalement, type ReponseSignalement } from "./signalements";
import { serveurVisiteur } from "./visiteur-serveur";

export async function enregistrerSignalement(annonceId: unknown, motif: unknown, details: unknown): Promise<ReponseSignalement> {
  if (typeof annonceId !== "string" || !idAnnonceValide(annonceId)) return { erreur: messageRefusSignalement("introuvable") };
  const texte = typeof details === "string" ? details.slice(0, 2000) : "";
  const probleme = verifierSignalement(motif, texte);
  if (probleme) return { erreur: probleme };

  const serveur = await serveurVisiteur();
  if (!serveur) return { erreur: messageRefusSignalement(undefined) };
  const { supabase, visiteur, adresse } = serveur;
  const { error } = await supabase.rpc("signaler_annonce", {
    annonce_id: Number(annonceId),
    motif: motif as string,
    details: texte.trim(),
    visiteur,
    adresse,
  });
  if (error) {
    if (!error.hint) console.error("Signalement refusé par la base :", error.code);
    return { erreur: messageRefusSignalement(error.hint) };
  }
  return { ok: true };
}
