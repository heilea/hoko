"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { lireGeste, maximumAnnonces, MESSAGE_EN_ATTENTE, peutPublier } from "@/lib/accounts";
import { getAccountListings, getVitrine } from "@/lib/compte-donnees";
import { getListingPhone, getProPhone, TAG_ANNONCES, TAG_VITRINES } from "@/lib/annonces-donnees";
import {
  lireEmail,
  validerInscription,
  validerMotDePasse,
  type ChampInscription,
  type InscriptionRenvoyee,
} from "@/lib/inscription";
import { lireDecision, messageErreurModeration, verifierMotifRefus } from "@/lib/moderation";
import { fermerSession, getSession } from "@/lib/session";
import { adresseDuSite, creerClientServeur } from "@/lib/supabase-serveur";
import { validerAnnonce, type AnnonceSaisie, type ChampAnnonce } from "@/lib/validation";
import { lireGesteVitrine, validerVitrine, type ChampVitrine, type VitrineSaisie } from "@/lib/vitrine";

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
  | { statut: "erreurs"; erreurs: Partial<Record<ChampAnnonce, string>>; saisie: AnnonceSaisie; general?: string }
  | { statut: "enregistree"; titre: string; id: string };

/**
 * Reçoit le formulaire de dépôt d'annonce, le vérifie, puis enregistre l'annonce dans Supabase
 * avec le statut « en attente de validation ». Elle n'apparaît sur le site qu'après validation
 * par l'administrateur. Le téléphone est celui du compte, gardé dans une table privée.
 *
 * Particulier : l'annonce va dans les catégories. Pro : elle va dans sa vitrine, jamais dans
 * les catégories (SPEC.md, 4 sexies) ; la base refuse qu'un pro dépose hors de sa vitrine.
 * Les photos partent ensuite une par une (photos-actions.ts), avec l'identifiant renvoyé.
 */
export async function soumettreAnnonce(_precedent: EtatDepot, formulaire: FormData): Promise<EtatDepot> {
  const saisie = lireSaisie(formulaire);

  // La page cache le formulaire aux visiteurs, mais l'action se protège elle-même
  const compte = await getSession();
  if (!compte) {
    return { statut: "erreurs", erreurs: {}, saisie, general: "Connectez-vous pour publier une annonce." };
  }
  const vitrine = await getVitrine(compte);
  if (compte.type === "pro" && !vitrine) {
    return { statut: "erreurs", erreurs: {}, saisie, general: "Votre vitrine est introuvable. Contactez Hoko." };
  }
  // 5 annonces en ligne au plus pour un particulier, 20 pour une vitrine
  if (!peutPublier(compte, await getAccountListings(compte))) return { statut: "limite", maximum: maximumAnnonces(compte) };

  const resultat = validerAnnonce(saisie);
  if (!resultat.ok) return { statut: "erreurs", erreurs: resultat.erreurs, saisie };
  const { annonce } = resultat;

  const supabase = await creerClientServeur();
  if (!supabase) return { statut: "erreurs", erreurs: {}, saisie, general: INDISPONIBLE };

  const { data: categorie } = await supabase.from("categories").select("id").eq("slug", annonce.categorie).maybeSingle();
  if (!categorie) return { statut: "erreurs", erreurs: { categorie: "Choisissez une catégorie." }, saisie };

  // Les règles d'accès de la base imposent l'auteur et le statut « en attente de validation »
  const { data: creee, error } = await supabase.from("listings").insert({
    user_id: compte.id,
    shop_id: vitrine?.id ?? null,
    category_id: categorie.id,
    titre: annonce.titre,
    description: annonce.description,
    prix_xpf: annonce.prixXpf,
    ile: annonce.ile,
    commune: annonce.commune,
    // Le nom affiché d'une annonce pro est celui de la vitrine
    vendeur_nom: vitrine?.nom ?? compte.nom,
    statut: "en_attente_validation",
  }).select("id").single();
  if (error || !creee) {
    console.error("Annonce refusée par la base :", error?.code);
    const general = error?.hint === "en_attente" ? MESSAGE_EN_ATTENTE : "L'annonce n'a pas pu être enregistrée. Réessayez dans quelques minutes.";
    return { statut: "erreurs", erreurs: {}, saisie, general };
  }
  return { statut: "enregistree", titre: annonce.titre, id: String(creee.id) };
}

// ───────────────────────── Gestion de ses annonces ─────────────────────────

/** Lit le formulaire de dépôt ou de modification, tronqué pour ne jamais traiter un envoi démesuré. */
function lireSaisie(formulaire: FormData): AnnonceSaisie {
  return {
    titre: lire(formulaire, "titre", 5000),
    categorie: lire(formulaire, "categorie", 5000),
    prix: lire(formulaire, "prix", 5000),
    description: lire(formulaire, "description", 5000),
    ile: lire(formulaire, "ile", 5000),
    commune: lire(formulaire, "commune", 5000),
    accord: formulaire.get("accord") === "on",
  };
}

/**
 * Modifie une annonce du compte connecté. Elle repasse en attente de validation (fonction
 * `modifier_annonce` de la base, qui vérifie aussi que l'annonce appartient au compte).
 */
export async function modifierAnnonce(_precedent: EtatDepot, formulaire: FormData): Promise<EtatDepot> {
  const saisie = lireSaisie(formulaire);
  const id = Number(lire(formulaire, "id", 20));

  const compte = await getSession();
  if (!compte) {
    return { statut: "erreurs", erreurs: {}, saisie, general: "Connectez-vous avec votre compte pour modifier cette annonce." };
  }
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { statut: "erreurs", erreurs: {}, saisie, general: "Cette annonce est introuvable." };
  }

  const resultat = validerAnnonce(saisie);
  if (!resultat.ok) return { statut: "erreurs", erreurs: resultat.erreurs, saisie };
  const { annonce } = resultat;

  const supabase = await creerClientServeur();
  if (!supabase) return { statut: "erreurs", erreurs: {}, saisie, general: INDISPONIBLE };
  const { error } = await supabase.rpc("modifier_annonce", {
    annonce_id: id,
    categorie: annonce.categorie,
    titre: annonce.titre,
    description: annonce.description,
    prix_xpf: annonce.prixXpf,
    ile: annonce.ile,
    commune: annonce.commune,
  });
  if (error) {
    console.error("Modification refusée par la base :", error.code);
    const general =
      error.code === "P0002"
        ? "Cette annonce est introuvable."
        : error.hint === "en_attente"
          ? MESSAGE_EN_ATTENTE
          : "L'annonce n'a pas pu être modifiée. Réessayez dans quelques minutes.";
    return { statut: "erreurs", erreurs: {}, saisie, general };
  }
  // L'annonce quitte le site le temps de la vérification
  updateTag(TAG_ANNONCES);
  redirect("/compte/annonces?fait=modifiee");
}

/**
 * Marquer vendue, retirer ou republier une annonce, depuis « Mes annonces ».
 * La base vérifie que l'annonce appartient au compte, que le geste est permis dans son état,
 * et la limite de 5 annonces en ligne (fonction `gerer_annonce`).
 */
export async function gererAnnonce(formulaire: FormData): Promise<void> {
  const id = Number(lire(formulaire, "id", 20));
  const geste = lireGeste(formulaire.get("geste"));
  const compte = await getSession();
  if (!compte) redirect("/connexion");
  if (!Number.isSafeInteger(id) || id <= 0 || !geste) redirect("/compte/annonces?erreur=geste");

  const supabase = await creerClientServeur();
  if (!supabase) redirect("/compte/annonces?erreur=indisponible");
  const { data, error } = await supabase.rpc("gerer_annonce", { annonce_id: id, geste });
  if (error) {
    console.error("Geste refusé par la base :", error.code);
    const motif = error.code !== "23514" ? "geste" : error.hint === "en_attente" ? "en_attente" : "limite";
    redirect(`/compte/annonces?erreur=${motif}`);
  }
  // Les pages publiques relisent aussitôt les annonces
  updateTag(TAG_ANNONCES);
  redirect(`/compte/annonces?fait=${data}`);
}

// ───────────────────────── Validation des annonces (administrateur) ─────────────────────────

export type EtatModeration = { erreur?: string; motif?: string };

/**
 * Valide ou refuse une annonce en attente. La base vérifie elle-même que la personne est
 * administrateur (fonction `moderer_annonce`) : la vérification ci-dessous sert à répondre
 * clairement, elle ne remplace pas celle de la base.
 */
export async function modererAnnonce(_precedent: EtatModeration, formulaire: FormData): Promise<EtatModeration> {
  const id = Number(lire(formulaire, "id", 20));
  const decision = lireDecision(formulaire.get("decision"));
  const motif = lire(formulaire, "motif", 2000);

  const compte = await getSession();
  if (!compte?.admin) return { erreur: messageErreurModeration("42501"), motif };
  if (!Number.isSafeInteger(id) || id <= 0 || !decision) return { erreur: messageErreurModeration("22023"), motif };
  if (decision === "refusee") {
    const probleme = verifierMotifRefus(motif);
    if (probleme) return { erreur: probleme, motif };
  }

  const supabase = await creerClientServeur();
  if (!supabase) return { erreur: INDISPONIBLE, motif };
  const { error } = await supabase.rpc("moderer_annonce", {
    annonce_id: id,
    decision,
    ...(decision === "refusee" ? { motif: motif.trim() } : {}),
  });
  if (error) {
    console.error("Décision refusée par la base :", error.code);
    return { erreur: messageErreurModeration(error.code), motif };
  }
  // Les pages publiques relisent aussitôt les annonces : une annonce validée apparaît sans attendre
  updateTag(TAG_ANNONCES);
  // Retour à la file, rechargée sans l'annonce traitée
  redirect(`/admin?fait=${decision}`);
}

// ───────────────────────── Vitrine d'un pro ─────────────────────────

export type EtatVitrine =
  | { statut: "initial" }
  | { statut: "erreurs"; erreurs: Partial<Record<ChampVitrine, string>>; saisie: VitrineSaisie; general?: string };

/**
 * Le pro modifie le profil de sa vitrine : secteur, lieu, présentation, horaires.
 * La base vérifie de nouveau tout (fonction `modifier_vitrine`) et ne touche que la vitrine du
 * compte connecté. Le nom de l'entreprise, le statut et le badge ne changent pas ici.
 */
export async function modifierVitrine(_precedent: EtatVitrine, formulaire: FormData): Promise<EtatVitrine> {
  const saisie: VitrineSaisie = {
    secteur: lire(formulaire, "secteur", 100),
    ile: lire(formulaire, "ile", 100),
    commune: lire(formulaire, "commune", 200),
    presentation: lire(formulaire, "presentation", 5000),
    horaires: lire(formulaire, "horaires", 2000),
  };
  const compte = await getSession();
  if (!compte || compte.type !== "pro") {
    return { statut: "erreurs", erreurs: {}, saisie, general: "Connectez-vous avec votre compte pro pour modifier votre vitrine." };
  }
  const resultat = validerVitrine(saisie);
  if (!resultat.ok) return { statut: "erreurs", erreurs: resultat.erreurs, saisie };
  const { vitrine } = resultat;

  const supabase = await creerClientServeur();
  if (!supabase) return { statut: "erreurs", erreurs: {}, saisie, general: INDISPONIBLE };
  const { error } = await supabase.rpc("modifier_vitrine", {
    categorie: vitrine.secteur,
    ile: vitrine.ile,
    commune: vitrine.commune,
    presentation: vitrine.presentation,
    horaires: vitrine.horaires,
  });
  if (error) {
    console.error("Vitrine refusée par la base :", error.code);
    return { statut: "erreurs", erreurs: {}, saisie, general: "La vitrine n'a pas pu être enregistrée. Réessayez dans quelques minutes." };
  }
  // L'annuaire et la page publique de la vitrine relisent aussitôt
  updateTag(TAG_VITRINES);
  redirect("/compte/vitrine?fait=1");
}

/**
 * Décision de l'administrateur sur une vitrine : badge, activation, suspension.
 * La base vérifie elle-même le rôle (fonction `decider_vitrine`).
 */
export async function deciderVitrine(formulaire: FormData): Promise<void> {
  const id = lire(formulaire, "id", 40);
  const geste = lireGesteVitrine(formulaire.get("geste"));
  const compte = await getSession();
  if (!compte?.admin) redirect("/connexion");
  if (!/^[0-9a-f-]{36}$/.test(id) || !geste) redirect("/admin/vitrines?erreur=1");

  const supabase = await creerClientServeur();
  if (!supabase) redirect("/admin/vitrines?erreur=1");
  const { error } = await supabase.rpc("decider_vitrine", { vitrine_id: id, geste });
  if (error) {
    console.error("Décision sur la vitrine refusée par la base :", error.code);
    redirect("/admin/vitrines?erreur=1");
  }
  // La vitrine et ses annonces apparaissent ou disparaissent aussitôt
  updateTag(TAG_VITRINES);
  updateTag(TAG_ANNONCES);
  redirect(`/admin/vitrines?fait=${geste}`);
}

// ───────────────────────── Voir le numéro ─────────────────────────

export type CibleContact = { type: "annonce" | "pro"; id: string };

/**
 * Donne le numéro à appeler quand un visiteur clique sur « Voir le numéro »,
 * sur une annonce ou sur la vitrine d'un pro.
 * Le numéro ne figure jamais dans la page : il n'est envoyé qu'à cette demande.
 *
 * La base compte chaque demande dans `contact_reveals` (statistique « contacts reçus »).
 * À faire avant l'ouverture : limiter le nombre de demandes par visiteur.
 */
export async function revealPhone(cible: CibleContact): Promise<string | null> {
  if (!cible || typeof cible.id !== "string" || cible.id.length > 60) return null;
  if (cible.type === "annonce") return getListingPhone(cible.id);
  if (cible.type === "pro") return getProPhone(cible.id);
  return null;
}
