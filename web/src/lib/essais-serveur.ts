/**
 * Limites d'essais (SPEC.md, section 4 octies), côté serveur seulement, avec la clé secrète.
 * La base ne reçoit que des empreintes de l'e-mail et de l'adresse IP.
 *
 * Si la base ne répond pas, l'essai est laissé passer (et l'erreur notée) : la limite est une
 * protection en plus, elle ne doit pas empêcher tout le monde de se connecter.
 */
import type { GenreEssai } from "./essais";
import { serveurEssais } from "./visiteur-serveur";

/**
 * « ok » ou « limite ». Avec `noter`, l'essai est compté (inscription, mot de passe oublié,
 * connexion ratée) ; sans, c'est un simple contrôle avant de tenter la connexion.
 */
export async function controlerEssai(genre: GenreEssai, email: string, noter: boolean): Promise<"ok" | "limite"> {
  const serveur = await serveurEssais();
  if (!serveur) return "ok";
  const { data, error } = await serveur.supabase.rpc("controler_essai", {
    genre_essai: genre,
    cle_essai: await serveur.cleEmail(email),
    adresse_essai: serveur.adresse,
    noter,
  });
  if (error) {
    console.error("Limite d'essais indisponible :", error.code);
    return "ok";
  }
  return data === "limite" ? "limite" : "ok";
}

/** Connexion réussie : les essais ratés de cet e-mail sont oubliés. */
export async function oublierEssais(genre: GenreEssai, email: string): Promise<void> {
  const serveur = await serveurEssais();
  if (!serveur) return;
  const { error } = await serveur.supabase.rpc("oublier_essais", {
    genre_essai: genre,
    cle_essai: await serveur.cleEmail(email),
  });
  if (error) console.error("Essais non effacés :", error.code);
}
