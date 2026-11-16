# Hoko — Cahier des charges

> **Version 0.1 — brouillon à valider.**
> Ce document fixe ce que Hoko doit faire, pour que le site grandisse dans une direction commune.
> Il est tiré de l'état réel du dépôt (MVP au commit `c01e7f5`) et des règles déjà écrites dans le code.
> Chaque règle est étiquetée :
> **[Acquis]** déjà décidé et présent dans le code · **[Proposé]** proposition à confirmer · **[À décider]** question ouverte, voir section 12.
>
> Le code renvoie plusieurs fois à un `SPEC.md` (sections 8 et « points à décider ») qui **n'existe pas dans le dépôt**. Ce document le remplace : une fois validé, ces renvois doivent pointer ici.

---

## 1. Présentation

**Hoko** est un site de petites annonces pour la Polynésie française. Des particuliers et des professionnels y publient des annonces ; les acheteurs les trouvent par catégorie ou par recherche et appellent directement le vendeur.

### 1.1 Objectifs

1. Offrir aux Polynésiens un endroit simple pour vendre, acheter, louer et trouver un service, sur toutes les îles.
2. Rester gratuit pour les particuliers.
3. Gagner de l'argent par trois offres claires : le **boost** d'annonce, la **vitrine pro** et l'**espace publicitaire** de l'accueil.
4. Rester rapide, lisible et utilisable sur un téléphone avec une connexion moyenne.

### 1.2 Hors périmètre en V1 [Proposé]

Messagerie interne, paiement entre acheteur et vendeur, livraison, avis et notes, application mobile native, version anglaise ou tahitienne de l'interface.

### 1.3 Principes qui guident les choix

- **Le contact passe par le téléphone.** L'e-mail n'est jamais affiché et le numéro n'est jamais présent dans le HTML de la page ([Acquis], voir 5.4).
- **Le serveur fait foi.** Toute règle vérifiée dans le navigateur est revérifiée côté serveur.
- **Le texte est en français simple.** Les messages d'erreur disent quoi faire (« Écrivez le prix en chiffres, sans centimes. Exemple : 25 000. »).
- **Un seul point d'accès aux données.** Les pages ne lisent la base que par les fonctions de `web/src/lib/` ; changer de fournisseur ne doit toucher que ces fichiers.

---

## 2. Utilisateurs

| Profil | Qui | Ce qu'il fait |
|---|---|---|
| **Visiteur** | Toute personne, sans compte | Parcourt, cherche, consulte une annonce ou une vitrine, révèle un numéro |
| **Particulier** | Vendeur occasionnel, avec compte | Dépose et gère ses annonces, achète un boost |
| **Pro** | Entreprise vérifiée (numéro TAHITI) | Ouvre une vitrine, publie jusqu'à 20 annonces, ne peut pas booster |
| **Administrateur** | Équipe Hoko | Valide les annonces, vérifie les pros, modère, gère la publicité |

---

## 3. Périmètre fonctionnel

Légende : ✅ présent dans le MVP (avec données d'exemple) · 🟡 maquette ou partiel · ⬜ à construire.

### 3.1 Côté visiteur

| Fonction | État | Règle |
|---|---|---|
| Accueil : recherche, catégories, annonces récentes, pros mis en avant | ✅ | — |
| Pages de catégorie | ✅ | Les annonces boostées passent en tête |
| Recherche par mot-clé | ✅ | Insensible aux accents et à la casse. Ne renvoie **pas** les annonces pro |
| Page d'annonce | 🟡 | Titre, prix, description, lieu, date, vendeur, annonces similaires. Photos : emplacement vide tant que l'envoi n'existe pas |
| Bouton « Voir le numéro » | ✅ | Numéro servi à la demande (5.4) |
| Annuaire des pros, filtre par secteur | ✅ | Seuls les pros vérifiés y figurent |
| Vitrine d'un pro | ✅ | Présentation, horaires, téléphone, annonces |
| Filtres avancés (île, prix, tri) | ⬜ | [Proposé] V1.1 |
| Signaler une annonce | ⬜ | [Proposé] V1 : indispensable dès que le trafic grandit |

### 3.2 Côté annonceur

| Fonction | État | Règle |
|---|---|---|
| Dépôt d'annonce (formulaire + validation serveur) | 🟡 | Valide les champs mais **n'enregistre rien** tant qu'il n'y a pas de base |
| Inscription | ⬜ | Page « bientôt disponible » |
| Connexion par e-mail + mot de passe | 🟡 | Session par cookie signé ; deux comptes de démonstration seulement |
| Tableau de bord, mes annonces, mon profil | 🟡 | Statuts et chiffres d'exemple |
| Modifier / supprimer / marquer « vendu » | ⬜ | [Proposé] V1 |
| Achat d'un boost | ⬜ | Statut « en attente de paiement » déjà modélisé |
| Statistiques réelles (vues, contacts) | ⬜ | « Contacts » = numéros révélés |
| Réinitialisation du mot de passe | ⬜ | V1 |

### 3.3 Côté administrateur ⬜

File de validation des annonces, vérification des pros (numéro TAHITI), traitement des signalements, suspension de compte ou de vitrine, gestion des réservations publicitaires, statistiques globales. Aucun écran n'existe encore.

---

## 4. Contenu et catégories

### 4.1 Catégories [Acquis, liste à confirmer]

Véhicules · Immobilier · Emploi · Services · Maison · Multimédia · Mode · Sports · Nautisme · Animaux.

Une annonce a **une seule** catégorie. Toute nouvelle catégorie exige un slug, un nom, une icône et une description courte (`web/src/lib/data.ts`).

### 4.2 Îles [Acquis, liste à confirmer]

Tahiti, Moorea, Raiatea, Bora Bora, Huahine, Nuku Hiva — liste d'exemple.
**[À décider]** : les îles couvertes en V1 (les archipels des Tuamotu, Gambier, Australes et Marquises sont-ils tous proposés ?). Le choix de l'île est une liste fermée ; la commune est un texte libre (60 caractères maximum).

---

## 5. Règles métier

### 5.1 Annonce [Acquis]

| Champ | Règle |
|---|---|
| Titre | Obligatoire, 80 caractères maximum |
| Catégorie | Obligatoire, dans la liste |
| Prix | Obligatoire, entier **en XPF**, supérieur à 0, sans centimes. « 220 000 » et « 220000 XPF » sont acceptés |
| Suffixe de prix | Optionnel (par exemple « / mois » pour une location) |
| Description | De 20 à 2 000 caractères. **Toute adresse e-mail est refusée** |
| Île / commune | Obligatoires |
| Téléphone | 8 chiffres, indicatif +689 accepté, enregistré au format « 87 12 34 56 » |
| Accord | Case obligatoire : le vendeur accepte l'affichage de son numéro |
| Photos | JPEG uniquement, 4 Mo maximum chacune ; **6 photos maximum [À confirmer]** |

**Cycle de vie** : `en attente de validation` → `active` ou `refusée`. Un administrateur valide chaque annonce avant publication [Acquis]. Un refus s'accompagne d'un motif lisible par l'annonceur [Proposé].
**À ajouter [Proposé]** : durée de vie d'une annonce (par exemple 60 jours, avec rappel avant expiration), statut `vendue`, statut `expirée`.

### 5.2 Boost [Acquis, prix à décider]

- Un boost fait remonter l'annonce **en tête de sa catégorie pendant 7 jours**.
- Statuts : `aucun`, `en attente de paiement`, `actif`.
- Réservé aux particuliers : **un pro ne peut pas booster**.
- **[À décider]** : prix du boost, moyens de paiement, nombre de boosts simultanés par catégorie, remboursement.

### 5.3 Vitrine pro [Acquis]

- **10 000 XPF par mois.**
- Contenu : page à son nom (présentation, horaires, téléphone), jusqu'à **20 annonces actives**, badge « Pro vérifié », présence dans l'annuaire, sur l'accueil et dans sa catégorie.
- Le badge n'est accordé qu'**après contrôle du numéro TAHITI**.
- Les annonces d'un pro **vivent uniquement dans sa vitrine** : elles n'apparaissent ni dans la recherche ni dans les pages de catégorie.
- Statuts de vitrine : `active`, `en attente de paiement`, `suspendue`.
- **[À décider]** : engagement minimum, résiliation, que devient la vitrine en cas de non-paiement, justificatifs demandés pour la vérification.

### 5.4 Contact et protection des données de contact [Acquis]

- Le numéro n'est **jamais** présent dans la page : il n'est envoyé qu'au clic sur « Voir le numéro » (action serveur `revealPhone`).
- Chaque révélation est enregistrée (table `contact_reveals`) : c'est la statistique « contacts reçus ».
- Une limite de demandes par visiteur doit empêcher le moissonnage des numéros.
- L'e-mail de l'annonceur est privé : il ne sert qu'à la connexion et aux notifications.

### 5.5 Publicité [Acquis, prix à décider]

- Emplacement sur la page d'accueil, **vendu au mois, payé d'avance**.
- La page de réservation (`/publicite`) est un « bientôt disponible ».
- **[À décider]** : nombre d'emplacements, tarif, format et poids des visuels, règles sur les contenus acceptés, qui valide.

### 5.6 Modération [Proposé]

Contenus interdits à lister (armes, produits illicites, annonces trompeuses, etc.), signalement par les visiteurs, délai de traitement visé (par exemple 48 h), sanctions graduées (retrait, avertissement, suspension).

---

## 6. Exigences non fonctionnelles

| Domaine | Exigence |
|---|---|
| **Langue** | Interface en français. Prix en XPF, format « 220 000 XPF » |
| **Mobile d'abord** | Conçu pour un téléphone ; toutes les fonctions utilisables sans souris |
| **Performance** | Pages publiques rendues côté serveur ou mises en cache ; images redimensionnées et compressées à l'envoi ; objectif [Proposé] : page de catégorie utilisable en moins de 3 s sur une connexion 4G moyenne |
| **Accessibilité** | Cible RGAA / WCAG 2.1 AA [Proposé] : contrastes, libellés de champs, navigation clavier, `aria-live` sur les erreurs |
| **SEO** | Une URL stable par annonce, par catégorie et par vitrine ; titres et descriptions propres ; sitemap ; annonces expirées retirées proprement |
| **Disponibilité** | [À décider] niveau visé et sauvegardes (au minimum une sauvegarde quotidienne de la base) |
| **Evolutivité** | Prévoir dès maintenant : pagination des listes, index de recherche, stockage externe des photos |

---

## 7. Sécurité et conformité

### 7.1 Sécurité

- **Mots de passe** : hachés (algorithme moderne type argon2 ou bcrypt), jamais en clair. Les mots de passe de démonstration actuels dans `accounts.ts` **doivent disparaître** avant toute mise en ligne.
- **Session** : cookie `httpOnly`, `sameSite=lax`, `secure` en production, signé avec `SESSION_SECRET`. **Sans cette variable, la connexion est désactivée en production** [Acquis].
- **Connexion** : même message d'erreur pour e-mail inconnu et mot de passe faux [Acquis] ; **limite d'essais à ajouter**.
- **Envoi de photos** : vérifier le type réel du fichier (pas seulement l'extension), retirer les métadonnées (position GPS), stocker hors du serveur applicatif.
- **Validation** : toujours côté serveur ; échapper tout texte saisi par les utilisateurs.
- **Anti-abus** : limite de dépôts par compte et par jour, limite de révélations de numéro, protection anti-robots sur l'inscription et le dépôt.
- **Secrets** : uniquement dans les variables d'environnement, jamais dans le dépôt.

### 7.2 Données personnelles [À valider avec un juriste]

Hoko traite des noms, numéros de téléphone et e-mails de résidents polynésiens. À prévoir : mentions légales, politique de confidentialité, conditions générales d'utilisation, consentement à l'affichage du numéro (déjà recueilli au dépôt), droit d'accès et de suppression des données, durée de conservation, bandeau de cookies si des traceurs sont ajoutés.
**[À décider]** : le cadre juridique applicable en Polynésie française (loi Informatique et libertés, RGPD, ou règles locales) à faire confirmer.

---

## 8. Architecture technique

### 8.1 Existant [Acquis]

- **Next.js 16 + React 19 + TypeScript**, dossier `web/`. Next.js 16 diffère des versions précédentes : lire `node_modules/next/dist/docs/` avant de coder (voir `web/AGENTS.md`).
- Données d'exemple dans `web/src/lib/data.ts` et `accounts.ts` ; règles de validation en fonctions pures dans `validation.ts`.
- Actions serveur dans `web/src/app/actions.ts`.
- Tests **Vitest** dans `web/tests/` (annonces, comptes, dépôt).
- Polices Clash Display et Satoshi (fichiers locaux). Maquettes HTML dans `maquettes/`.

### 8.2 À choisir [À décider]

| Sujet | Options à comparer |
|---|---|
| Base de données | PostgreSQL (Supabase, Neon, serveur propre) |
| Authentification | Solution gérée (Supabase Auth, Clerk, Auth.js) ou maison |
| Stockage des photos | Stockage objet avec CDN, redimensionnement automatique |
| Paiement | Solution acceptant le XPF, ou paiement en euros converti ; virement / paiement en agence pour la pub |
| Hébergement | Vercel ou serveur ; **latence depuis le Pacifique** à mesurer |
| E-mails | Service transactionnel (confirmation, rappel d'expiration, validation) |
| Recherche | Recherche SQL au début, moteur dédié si le volume le demande |

### 8.3 Modèle de données cible [Proposé]

`utilisateurs` · `annonces` (statut, boost, date d'expiration) · `photos` · `pros` (numéro TAHITI, statut de vérification, abonnement) · `contact_reveals` · `boosts` · `paiements` · `reservations_pub` · `signalements` · `journal_moderation`.

### 8.4 Règles de développement

- Une règle métier = une fonction pure testée. Pas de règle cachée dans un composant.
- Aucun accès aux données hors de `web/src/lib/`.
- Toute nouvelle page publique précise son titre, sa description et son état « vide » / « chargement » / « erreur ».
- `npm run lint` et `npm test` passent avant chaque fusion.
- Un changement de règle métier met à jour **ce document** dans la même demande de fusion.

---

## 9. Charte et ergonomie [Acquis]

Les maquettes `maquettes/accueil.html` et `maquettes/polices.html` font référence pour l'identité visuelle : typographie (Clash Display pour les titres, Satoshi pour le texte), icônes de catégorie (`Icon.tsx`), composants (carte d'annonce, badge « Pro vérifié », bandeau d'offre). Toute nouvelle page réutilise ces éléments plutôt que d'en créer d'autres.

---

## 10. Plan de livraison [Proposé]

| Phase | Contenu | Condition de sortie |
|---|---|---|
| **0 — Cadrage** | Valider ce document, trancher les points critiques de la section 12 | Document signé |
| **1 — Fondations** | Base de données, vraie authentification, inscription, enregistrement des annonces, photos | Un particulier publie une vraie annonce |
| **2 — Modération** | Espace administrateur, file de validation, signalements | Aucune annonce publique sans validation |
| **3 — Revenus** | Boost payant, ouverture d'une vitrine pro avec vérification TAHITI, réservation de publicité | Un premier paiement réel |
| **4 — Croissance** | Filtres, expiration et rappels, statistiques réelles, SEO, notifications | Suivi des indicateurs de la section 11 |
| **5 — Lancement public** | Juridique, sauvegardes, supervision, campagne | Mise en ligne |

Les phases 1 et 2 sont un **prérequis** à toute ouverture au public : aujourd'hui, rien n'est enregistré.

---

## 11. Indicateurs de succès [Proposé]

Annonces actives · nouvelles annonces par semaine · numéros révélés par annonce · part des annonces validées sous 24 h · nombre de pros vérifiés · revenus mensuels par offre (boost, vitrine, publicité) · taux d'annonces signalées.

---

## 12. Points à décider

Classés par urgence : les premiers bloquent la phase 1.

| # | Question | Pourquoi c'est bloquant |
|---|---|---|
| 1 | Fournisseur de base de données et d'authentification | Rien n'est enregistré sans |
| 2 | Îles et catégories couvertes en V1 | Structure des filtres et du SEO |
| 3 | Nombre de photos par annonce (6 proposé) | Stockage et formulaire |
| 4 | Durée de vie d'une annonce et règles d'expiration | Modèle de données |
| 5 | Qui valide les annonces, et sous quel délai ? | Charge d'exploitation |
| 6 | Prix du boost et de la publicité ; moyens de paiement | Phase 3 |
| 7 | Procédure de vérification d'un pro (justificatifs TAHITI) | Phase 3 |
| 8 | Cadre juridique et données personnelles | Avant toute ouverture |
| 9 | Hébergement et niveau de disponibilité visé | Coût et latence |
| 10 | Nom de domaine et exploitant légal du site | Mentions légales |

---

## 13. Maintenance de ce document

- Une décision prise → passer l'étiquette de **[À décider]** à **[Acquis]** et retirer la ligne de la section 12.
- Une fonction livrée → mettre à jour la colonne « État » de la section 3.
- Remplacer les mentions `SPEC.md` du code par un renvoi à `docs/CAHIER_DES_CHARGES.md`.
