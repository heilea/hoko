"use server";

import { redirect } from "next/navigation";
import { peutPublier } from "@/lib/accounts";
import { getAccountListings } from "@/lib/compte-donnees";
import { getListingPhone, getProPhone, MAX_ANNONCES_PARTICULIER } from "@/lib/data";
import {
  lireEmail,
  validerInscription,
  validerMotDePasse,
  type ChampInscription,
  type InscriptionRenvoyee,
} from "@/lib/inscription";
import { fermerSession, getSession } from "@/lib/session";
import { adresseDuSite, creerClientServeur } from "@/lib/supabase-serveur";
import { validerAnnonce, type AnnonceSaisie, type AnnonceValide, type ChampAnnonce } from "@/lib/validation";

const INDISPONIBLE = "Ce service est indisponible pour le moment. Réessayez plus tard.";
const TROP_D_ESSAIS = "Trop d'essais en peu de temps. Patientez quelques minutes avant de réessayer.";

/** Lit un champ texte d'un formulaire, tronqué pour ne jamais traiter un envoi démesuré. */
function lire(formulaire: FormData, champ: string, max = 500): string {
  const valeur = formulaire.get(champ);
  return typeof valeur === "string" ? valeur.slice(0, max) : "";
}

/** Erreur Supabase Auth : seuls le code et le statut sont utilisés, jamais les données saisies. */
type ErreurAuth = { code?: string; status?: number } | null;

function tropDEssais(erreur: ErreurAuth): boolean {
  return erreur?.status === 429 || Boolean(erreur?.code?.startsWith("over_"));
}

// ───────────────────────── Connexion ─────────────────────────

export type EtatConnexion = { erreur?: string; email?: string };

/**
 * Connexion d'un annonceur. Le message est le même que l'e-mail soit inconnu ou le mot de
 * passe faux, pour ne pas révéler quels comptes existent. Supabase limite les essais.
 */
export async function seConnecter(_precedent: EtatConnexion, formulaire: FormData): Promise<EtatConnexion> {
  const email = lire(formulaire, "email", 200);
  const motDePasse = lire(formulaire, "motDePasse", 200);

  if (!email.trim() || !motDePasse) return { erreur: "Saisissez votre e-mail et votre mot de passe.", email };
  const supabase = await creerClientServeur();
  if (!supabase) return { erreur: INDISPONIBLE, email };

  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: motDePasse });
  if (error) {
    if (tropDEssais(error)) return { erreur: TROP_D_ESSAIS, email };
    if (error.code === "email_not_confirmed") {
      return { erreur: "Confirmez d'abord votre adresse : cliquez sur le lien reçu par e-mail à l'inscription.", email };
    }
    return { erreur: "E-mail ou mot de passe incorrect.", email };
  }
  redirect("/compte");
}

export async function seDeconnecter(): Promise<void> {
  await fermerSession();
  redirect("/");
}

// ───────────────────────── Inscription ─────────────────────────

export type EtatInscription =
  | { statut: "initial" }
  | { statut: "erreurs"; erreurs: Partial<Record<ChampInscription, string>>; saisie: InscriptionRenvoyee; general?: string }
  | { statut: "envoye"; email: string };

/**
 * Crée le compte dans Supabase Auth, puis Supabase envoie un lien de confirmation.
 * Le profil (et la vitrine d'un pro) est créé dans la base par un déclencheur.
 *
 * Si l'e-mail a déjà un compte, Supabase ne crée rien et la page affiche le même message :
 * on ne révèle pas quelles adresses sont inscrites. Les mots de passe ne sont jamais renvoyés
 * au navigateur.
 */
export async function sInscrire(_precedent: EtatInscription, formulaire: FormData): Promise<EtatInscription> {
  const saisie: InscriptionRenvoyee = {
    type: lire(formulaire, "type"),
    nom: lire(formulaire, "nom"),
    email: lire(formulaire, "email"),
    telephone: lire(formulaire, "telephone"),
    numeroTahiti: lire(formulaire, "numeroTahiti"),
    secteur: lire(formulaire, "secteur"),
    ile: lire(formulaire, "ile"),
    commune: lire(formulaire, "commune"),
  };
  const motDePasse = lire(formulaire, "motDePasse");
  const resultat = validerInscription({ ...saisie, motDePasse, confirmation: lire(formulaire, "confirmation") });
  if (!resultat.ok) return { statut: "erreurs", erreurs: resultat.erreurs, saisie };

  const supabase = await creerClientServeur();
  const site = adresseDuSite();
  if (!supabase || !site) return { statut: "erreurs", erreurs: {}, saisie, general: INDISPONIBLE };

  const { compte } = resultat;
  const { data, error } = await supabase.auth.signUp({
    email: compte.email,
    password: motDePasse,
    options: {
      emailRedirectTo: `${site}/auth/confirmation?suite=/compte`,
      // Lu par le déclencheur qui crée le profil et la vitrine (supabase/migrations)
      data: {
        type: compte.type,
        nom: compte.nom,
        telephone: compte.telephone,
        ...(compte.vitrine ?? {}),
      },
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { statut: "erreurs", erreurs: { motDePasse: "Ce mot de passe est trop facile à deviner. Choisissez-en un autre." }, saisie };
    }
    if (error.code === "email_address_invalid") {
      return { statut: "erreurs", erreurs: { email: "Cet e-mail n'est pas accepté. Vérifiez l'adresse." }, saisie };
    }
    const general = tropDEssais(error) ? TROP_D_ESSAIS : "L'inscription n'a pas abouti. Réessayez dans quelques minutes.";
    console.error("Inscription refusée par Supabase :", error.code ?? error.status);
    return { statut: "erreurs", erreurs: {}, saisie, general };
  }

  // Si la confirmation par e-mail est désactivée dans Supabase, la session est déjà ouverte
  if (data.session) redirect("/compte");
  return { statut: "envoye", email: compte.email };
}

// ───────────────────────── Mot de passe oublié ─────────────────────────

export type EtatMotDePasseOublie = { statut: "initial" | "envoye"; erreur?: string; email?: string };

/** Envoie un lien pour choisir un nouveau mot de passe. Même réponse que l'adresse ait un compte ou non. */
export async function demanderNouveauMotDePasse(
  _precedent: EtatMotDePasseOublie,
  formulaire: FormData,
): Promise<EtatMotDePasseOublie> {
  const saisie = lire(formulaire, "email", 200);
  const email = lireEmail(saisie);
  if (!email) return { statut: "initial", erreur: "Saisissez l'e-mail de votre compte. Exemple : prenom@exemple.pf.", email: saisie };

  const supabase = await creerClientServeur();
  const site = adresseDuSite();
  if (!supabase || !site) return { statut: "initial", erreur: INDISPONIBLE, email: saisie };

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/auth/confirmation?suite=/mot-de-passe/nouveau`,
  });
  if (tropDEssais(error)) return { statut: "initial", erreur: TROP_D_ESSAIS, email: saisie };
  if (error) console.error("Demande de mot de passe refusée par Supabase :", error.code ?? error.status);
  return { statut: "envoye", email };
}

export type EtatNouveauMotDePasse = { erreurs?: { motDePasse?: string; confirmation?: string }; general?: string };

/** Enregistre le nouveau mot de passe, après l'arrivée par le lien reçu par e-mail. */
export async function changerMotDePasse(
  _precedent: EtatNouveauMotDePasse,
  formulaire: FormData,
): Promise<EtatNouveauMotDePasse> {
  const motDePasse = lire(formulaire, "motDePasse");
  const erreurs = validerMotDePasse(motDePasse, lire(formulaire, "confirmation"));
  if (Object.keys(erreurs).length > 0) return { erreurs };

  const supabase = await creerClientServeur();
  if (!supabase) return { general: INDISPONIBLE };
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { general: "Le lien a expiré. Demandez-en un nouveau depuis la page « Mot de passe oublié »." };

  const { error } = await supabase.auth.updateUser({ password: motDePasse });
  if (error) {
    if (error.code === "same_password") return { erreurs: { motDePasse: "Choisissez un mot de passe différent de l'ancien." } };
    if (error.code === "weak_password") return { erreurs: { motDePasse: "Ce mot de passe est trop facile à deviner. Choisissez-en un autre." } };
    if (tropDEssais(error)) return { general: TROP_D_ESSAIS };
    console.error("Changement de mot de passe refusé par Supabase :", error.code ?? error.status);
    return { general: "Le mot de passe n'a pas pu être changé. Réessayez dans quelques minutes." };
  }
  redirect("/compte");
}

// ───────────────────────── Dépôt d'annonce ─────────────────────────

export type EtatDepot =
  | { statut: "initial" }
  | { statut: "limite"; maximum: number }
  | { statut: "erreurs"; erreurs: Partial<Record<ChampAnnonce, string>>; saisie: AnnonceSaisie }
  | { statut: "valide"; annonce: AnnonceValide };

/**
 * Reçoit le formulaire de dépôt d'annonce et le vérifie côté serveur.
 *
 * L'annonce valide n'est PAS encore enregistrée : elle est renvoyée telle quelle pour l'aperçu,
 * et la page le dit clairement. À faire ensuite : exiger un compte, enregistrer l'annonce avec
 * le statut « en attente de validation », puis recevoir les photos.
 */
export async function soumettreAnnonce(_precedent: EtatDepot, formulaire: FormData): Promise<EtatDepot> {
  // Un particulier connecté qui a déjà 5 annonces actives ne peut pas en déposer une autre.
  // Le dépôt n'exige pas encore de compte : la limite ne s'applique donc qu'aux connectés.
  const compte = await getSession();
  if (compte?.type === "particulier" && !peutPublier(compte, await getAccountListings(compte))) {
    return { statut: "limite", maximum: MAX_ANNONCES_PARTICULIER };
  }

  const saisie: AnnonceSaisie = {
    titre: lire(formulaire, "titre", 5000),
    categorie: lire(formulaire, "categorie", 5000),
    prix: lire(formulaire, "prix", 5000),
    description: lire(formulaire, "description", 5000),
    ile: lire(formulaire, "ile", 5000),
    commune: lire(formulaire, "commune", 5000),
    telephone: lire(formulaire, "telephone", 5000),
    accord: formulaire.get("accord") === "on",
  };
  const resultat = validerAnnonce(saisie);
  if (!resultat.ok) return { statut: "erreurs", erreurs: resultat.erreurs, saisie };
  return { statut: "valide", annonce: resultat.annonce };
}

// ───────────────────────── Voir le numéro ─────────────────────────

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
