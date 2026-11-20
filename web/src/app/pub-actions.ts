"use server";

/**
 * Espaces pub (SPEC.md, section 3 ter) : l'administrateur crée une pub « en attente de
 * paiement » avec son visuel, puis l'active à réception des fonds, l'annule ou la retire.
 *
 * Le visuel est vérifié et recadré par le serveur (`traiterVisuelPub`), déposé dans le stockage
 * avec la clé secrète (`pubs/<au hasard>.jpg`), puis la pub est inscrite par la fonction
 * `creer_pub`, qui vérifie elle-même le rôle. Toutes les décisions passent par `decider_pub`.
 */
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { traiterVisuelPub } from "@/lib/photos-traitement";
import { lireGestePub, validerPub } from "@/lib/pubs";
import { TAG_PUBS } from "@/lib/pubs-donnees";
import { getSession } from "@/lib/session";
import { creerClientServeur } from "@/lib/supabase-serveur";
import { stockagePhotos } from "@/lib/supabase-stockage";

function lire(formulaire: FormData, champ: string, max: number): string {
  const valeur = formulaire.get(champ);
  return typeof valeur === "string" ? valeur.trim().slice(0, max) : "";
}

export async function creerPub(formulaire: FormData): Promise<void> {
  const compte = await getSession();
  if (!compte?.admin) redirect("/connexion");

  const saisie = {
    emplacement: lire(formulaire, "emplacement", 20),
    categorie: lire(formulaire, "categorie", 60),
    annonceur: lire(formulaire, "annonceur", 120),
    lien: lire(formulaire, "lien", 600),
  };
  // Seul le nom du champ part dans l'adresse ; la page affiche le message correspondant
  const champ = Object.keys(validerPub(saisie))[0];
  if (champ) redirect(`/admin/pubs?erreur=${champ}`);

  const fichier = formulaire.get("visuel");
  if (!(fichier instanceof File) || fichier.size === 0) redirect("/admin/pubs?erreur=visuel");
  const visuel = await traiterVisuelPub(new Uint8Array(await fichier.arrayBuffer()));
  if ("erreur" in visuel) redirect("/admin/pubs?erreur=visuel");

  const supabase = await creerClientServeur();
  const stockage = stockagePhotos();
  if (!supabase || !stockage) redirect("/admin/pubs?erreur=1");

  const chemin = `pubs/${crypto.randomUUID()}.jpg`;
  const envoi = await stockage.upload(chemin, visuel, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
  if (envoi.error) {
    console.error("Visuel refusé par le stockage :", envoi.error.message);
    redirect("/admin/pubs?erreur=1");
  }

  const { error } = await supabase.rpc("creer_pub", {
    emplacement: saisie.emplacement,
    // Ignorée par la base pour l'accueil
    categorie: saisie.emplacement === "categorie" ? saisie.categorie : "",
    annonceur: saisie.annonceur,
    lien: saisie.lien,
    visuel: chemin,
  });
  if (error) {
    // La base refuse : le visuel déposé ne doit pas rester orphelin
    await stockage.remove([chemin]);
    console.error("Pub refusée par la base :", error.code, error.hint);
    redirect("/admin/pubs?erreur=1");
  }
  redirect("/admin/pubs?fait=creee");
}

export async function deciderPub(formulaire: FormData): Promise<void> {
  const compte = await getSession();
  if (!compte?.admin) redirect("/connexion");
  const id = Number(lire(formulaire, "id", 20));
  const geste = lireGestePub(formulaire.get("geste"));
  if (!Number.isSafeInteger(id) || id <= 0 || !geste) redirect("/admin/pubs?erreur=1");
  // Retirer une pub payée exige la case cochée, vérifiée ici aussi et pas seulement dans la page
  if (geste === "retirer" && formulaire.get("confirmation") !== "oui") redirect("/admin/pubs?erreur=confirmation");

  const supabase = await creerClientServeur();
  if (!supabase) redirect("/admin/pubs?erreur=1");
  const { data: visuel, error } = await supabase.rpc("decider_pub", { pub_id: id, geste });
  if (error) {
    console.error("Décision sur la pub refusée par la base :", error.code, error.hint);
    redirect(`/admin/pubs?erreur=${error.hint === "occupe" ? "occupe" : "1"}`);
  }
  // Commande annulée : son visuel n'a plus d'usage
  if (geste === "annuler" && visuel) await stockagePhotos()?.remove([visuel]);
  updateTag(TAG_PUBS);
  redirect(`/admin/pubs?fait=${geste}`);
}
