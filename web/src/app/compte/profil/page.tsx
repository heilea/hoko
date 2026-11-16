import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVitrine } from "@/lib/compte-donnees";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Mon profil" };

// Espace privé : la page attend la session côté serveur, sans chercher la navigation instantanée
export const instant = false;

export default async function ProfilePage() {
  const compte = await getSession();
  if (!compte) redirect("/connexion");

  const vitrine = await getVitrine(compte);

  return (
    <>
      <h1>Mon profil</h1>

      <div className="carte">
        <h2>Mes coordonnées</h2>
        <dl className="details details-nus">
          <dt>{compte.type === "pro" ? "Entreprise" : "Prénom"}</dt>
          <dd>{compte.nom}</dd>
          <dt>E-mail</dt>
          <dd>{compte.email}</dd>
          <dt>Téléphone</dt>
          <dd>{compte.telephone}</dd>
          <dt>Type de compte</dt>
          <dd>{compte.type === "pro" ? "Professionnel" : "Particulier"}</dd>
        </dl>
        <p className="small muted">
          Votre e-mail sert à vous connecter et n&apos;est jamais affiché. Votre téléphone apparaît sur vos annonces au clic
          sur « Voir le numéro ».
        </p>
      </div>

      {vitrine && (
        <div className="carte">
          <h2>Ma vitrine</h2>
          <dl className="details details-nus">
            <dt>Secteur</dt>
            <dd>{vitrine.secteur}</dd>
            <dt>Adresse</dt>
            <dd>
              {vitrine.commune}, {vitrine.ile}
            </dd>
            <dt>Horaires</dt>
            <dd>
              {vitrine.horaires.length > 0
                ? vitrine.horaires.map((ligne) => (
                    <span key={ligne} className="ligne">
                      {ligne}
                    </span>
                  ))
                : "Non renseignés"}
            </dd>
            <dt>Numéro TAHITI</dt>
            <dd>{vitrine.verifie ? "Contrôlé par Hoko" : "En attente de contrôle"}</dd>
            <dt>Présentation</dt>
            <dd className="description">{vitrine.presentation || "Non renseignée"}</dd>
          </dl>
        </div>
      )}

      <div className="avis">
        <p>Modifier vos coordonnées ou votre mot de passe en ligne n&apos;est pas encore possible.</p>
      </div>
    </>
  );
}
