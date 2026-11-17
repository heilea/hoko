# Hoko — Cahier des charges

> **Version 0.2 — brouillon à valider.**
> Ce document fixe ce que Hoko doit faire, pour que le site grandisse dans une direction commune.
> Il est tiré de l'état réel du dépôt (MVP au commit `6cda6ac`) et de la spécification interne du projet.
> Chaque règle est étiquetée :
> **[Acquis]** déjà décidé et présent dans le code · **[Proposé]** proposition à confirmer · **[À décider]** question ouverte, voir section 12.
>
> Le code renvoie à un `SPEC.md` : c'est la spécification interne, qui n'est pas publiée dans ce dépôt. Elle reste la référence ; ce document en est la version publiée et doit toujours dire la même chose.

---

## 1. Présentation

**Hoko** est un site de petites annonces pour la Polynésie française. Des particuliers et des professionnels y publient des annonces ; les acheteurs les trouvent par catégorie ou par recherche et appellent directement le vendeur.

### 1.1 Objectifs

1. Offrir aux Polynésiens un endroit simple pour vendre, acheter, louer et trouver un service, sur toutes les îles.
2. Rester gratuit pour les particuliers.
3. Gagner de l'argent par quatre offres claires : le **boost** d'annonce, la **vitrine pro**, l'**espace publicitaire de l'accueil** et l'**espace publicitaire d'en-tête de catégorie**.
4. Rester rapide, lisible et utilisable sur un téléphone avec une connexion moyenne.

### 1.2 Hors périmètre en V1

- **[Acquis]** Messagerie interne, paiement en ligne automatisé (en V1, l'administrateur active à la main après réception des fonds), application mobile native, avis et notes, statistiques avancées.
- **[Proposé]** Paiement entre acheteur et vendeur, livraison, version anglaise ou tahitienne de l'interface.

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
| **Particulier** | Vendeur occasionnel, avec compte | Dépose et gère ses annonces (5 actives au plus), achète un boost |
| **Pro** | Entreprise vérifiée (numéro TAHITI) | Ouvre une vitrine, publie jusqu'à 20 annonces, ne peut pas booster |
| **Administrateur** | Équipe Hoko | Valide les annonces, vérifie les pros, modère, gère la publicité |

---

## 3. Périmètre fonctionnel

Légende : ✅ présent dans le MVP (avec données d'exemple) · 🟡 maquette ou partiel · ⬜ à construire.

### 3.1 Côté visiteur

| Fonction | État | Règle |
|---|---|---|
| Accueil : recherche, catégories, annonces de particuliers, pros mis en avant | 🟡 | Lu dans la base, trié par date de création (les plus récentes d'abord), sans boost. Pas encore de pagination : jusqu'à 100 annonces d'un coup (voir 3.1.1)
| Pages de catégorie | ✅ | Les annonces boostées passent en tête |
| Recherche par mot-clé | ✅ | Insensible aux accents et à la casse. Ne renvoie **pas** les annonces pro |
| Page d'annonce | 🟡 | Titre, prix, description, lieu, date, vendeur, annonces similaires. Photos : emplacement vide tant que l'envoi n'existe pas |
| Bouton « Voir le numéro » | ✅ | Numéro servi à la demande (5.4) |
| Annuaire des pros, filtre par secteur | ✅ | Seuls les pros vérifiés y figurent |
| Vitrine d'un pro | ✅ | Présentation, horaires, téléphone, annonces |
| Liste et recherche par île | 🟡 | [Acquis] V1. Aujourd'hui, le nom de l'île est seulement reconnu dans la recherche par mot-clé |
| Filtres avancés (prix, tri) | ⬜ | [Proposé] V1.1 |
| Signaler une annonce | ⬜ | [Proposé] V1 : indispensable dès que le trafic grandit |

#### 3.1.1 Annonces de l'accueil [Acquis]

- **Tri** : de la plus récente à la plus ancienne, sur une vraie date de publication enregistrée en base (le champ texte `publiee`, du type « hier », est remplacé par une date, et le libellé est calculé à l'affichage).
- **Limite** : 10 à 12 annonces par page (nombre exact à fixer à la construction), avec la pagination décrite en 5.9. Aujourd'hui tout s'affiche d'un coup.
- **Boost** : aucun boost sur l'accueil. Il n'en change pas l'ordre, trié uniquement par date de création, et le badge « Boost » n'y est pas affiché, recherche comprise. Une annonce boostée ne passe en tête, avec son badge, que dans sa catégorie.
- **Exclusions** : les annonces pro n'y figurent pas, comme dans la recherche et les catégories ; les annonces `en attente de validation`, `refusée`, `vendue` ou `expirée` n'y figurent pas non plus.
- **Recherche** : le tri par date s'applique aussi aux résultats, sauf si un tri par pertinence est choisi plus tard.

### 3.2 Côté annonceur

| Fonction | État | Règle |
|---|---|---|
| Dépôt d'annonce | 🟡 | Réservé aux particuliers connectés. L'annonce est enregistrée « en attente de validation », avec le téléphone du compte. Photos pas encore envoyées |
| Inscription | ✅ | Particulier ou pro (5.8), avec Supabase Auth et confirmation de l'adresse par e-mail. La vitrine d'un pro est créée « en attente de paiement » |
| Connexion par e-mail + mot de passe | ✅ | Supabase Auth, qui limite les essais. Plus de comptes de démonstration |
| Tableau de bord, mes annonces, mon profil | 🟡 | Statuts et chiffres d'exemple |
| Modifier / retirer / marquer « vendue » / republier | ⬜ | [Acquis] V1, règles en 5.1 |
| Achat d'un boost | ⬜ | Statut « en attente de paiement » déjà modélisé |
| Statistiques réelles (vues, contacts) | ⬜ | « Contacts » = numéros révélés |
| Réinitialisation du mot de passe | ✅ | Lien envoyé par e-mail |

### 3.3 Côté administrateur 🟡

- ✅ **File de validation des annonces** (`/admin`) : les plus anciennes d'abord ; valider, ou refuser avec un motif que l'annonceur lit dans « Mes annonces ». La base vérifie le rôle d'administrateur à chaque décision et garde qui a décidé et quand.
- ⬜ Vérification des pros (numéro TAHITI), traitement des signalements, suspension de compte ou de vitrine, gestion des réservations publicitaires, statistiques globales.

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

**Limite par particulier [Acquis]** : **5 annonces actives au plus**. Elle évite les annonces sans intérêt et empêche un professionnel de se faire passer pour un particulier. Au-delà, le particulier retire une annonce ou ouvre une vitrine pro. **[À décider]** : les annonces en attente de validation comptent-elles dans les 5 ?

**Cycle de vie** : `en attente de validation` → `active` ou `refusée`. Un administrateur valide chaque annonce avant publication [Acquis]. Un refus s'accompagne d'un motif lisible par l'annonceur, de 5 à 500 caractères [Acquis].

**Durée et gestion par l'annonceur [Acquis]** : la gestion doit rester simple, chaque annonce de « Mes annonces » montre son état, sa date de fin et un ou deux boutons clairs.

| Action ou événement | Effet |
|---|---|
| Validation | L'annonce est en ligne pour **30 jours**, comptés à partir de la validation |
| Marquer « vendue » | Elle quitte le site tout de suite et libère une des 5 places ; pas de badge « Vendu » public |
| Retirer | Même effet, sans être vendue |
| Fin des 30 jours | Statut `expirée` : elle quitte le site et libère sa place |
| Republier (expirée, retirée ou vendue) | 30 nouveaux jours, sans nouvelle validation si le contenu n'a pas changé ; dans la limite de 5 annonces en ligne |
| Modifier le contenu ou les photos | Retour **en attente de validation** ; à la validation, 30 jours repartent |
| Boost qui dépasse la fin | La fin de l'annonce est repoussée jusqu'à la fin du boost |

Les photos d'une annonce terminée sont effacées 30 jours après la fin **[À confirmer]**. Rappel par e-mail avant expiration : avec Resend. **[À décider]** : durée des annonces pro, qui suivent aujourd'hui leur vitrine.

### 5.2 Boost [Acquis]

- Un boost fait remonter l'annonce **en tête de sa catégorie pendant 7 jours**, pour **700 XPF**.
- Statuts : `aucun`, `en attente de paiement`, `actif`.
- Réservé aux particuliers : **un pro ne peut pas booster**.
- Il reste « en attente de paiement » jusqu'à réception des fonds (5.7).
- **[À décider]** : nombre de boosts simultanés par catégorie, remboursement.

### 5.3 Vitrine pro [Acquis]

- **10 000 XPF par mois.**
- Contenu : page à son nom (présentation, horaires, téléphone), jusqu'à **20 annonces actives**, badge « Pro vérifié », présence dans l'annuaire, sur l'accueil et dans sa catégorie.
- Le badge n'est accordé qu'**après contrôle du numéro TAHITI**.
- Les annonces d'un pro **vivent uniquement dans sa vitrine** : elles n'apparaissent ni dans la recherche ni dans les pages de catégorie.
- Statuts de vitrine : `active`, `en attente de paiement`, `suspendue`. Pas de période d'essai en V1 : la vitrine s'active à réception de l'abonnement (5.7).
- **[À décider]** : engagement minimum, résiliation, que devient la vitrine en cas de non-paiement, justificatifs demandés pour la vérification.

### 5.4 Contact et protection des données de contact [Acquis]

- Le numéro n'est **jamais** présent dans la page : il n'est envoyé qu'au clic sur « Voir le numéro » (action serveur `revealPhone`).
- Chaque révélation est enregistrée (table `contact_reveals`) : c'est la statistique « contacts reçus ».
- Une limite de demandes par visiteur doit empêcher le moissonnage des numéros.
- L'e-mail de l'annonceur est privé : il ne sert qu'à la connexion et aux notifications.

### 5.5 Publicité [Acquis]

- Deux espaces, **vendus au mois, payés d'avance**, sans reconduction automatique en V1 :
  - **page d'accueil** : 100 000 XPF par mois, un seul annonceur à la fois ;
  - **en-tête d'une catégorie** : 45 000 XPF par mois, même tarif pour toutes les catégories en V1. L'espace est lié à la catégorie : un plombier achète « Plomberie ».
- Un espace est exclusif (un seul annonceur) ou en rotation (plusieurs annonceurs qui alternent).
- L'administrateur valide et programme les visuels à la main.
- La page de réservation (`/publicite`) est un « bientôt disponible ».
- **[À décider]** : tarif de l'exclusivité par rapport à la rotation, format et poids des visuels, règles sur les contenus acceptés.

### 5.6 Modération [Proposé]

Contenus interdits à lister (armes, produits illicites, annonces trompeuses, etc.), signalement par les visiteurs, délai de traitement visé (par exemple 48 h), sanctions graduées (retrait, avertissement, suspension).

### 5.7 Paiement et activation [Acquis]

| Mode | Qui peut l'utiliser | Remarque |
|---|---|---|
| Carte bancaire | Tous les comptes | Passerelle à confirmer : OSB/PayZen ou NiuPay. Stripe n'est pas disponible pour une entreprise basée en Polynésie |
| Virement | Tous les comptes | Numéro de commande en référence, rapproché à la main |
| Espèces | Tous les comptes | Lieu et modalités de remise à définir |
| Bon de commande | Pros d'une liste de comptes habituels validée par l'administrateur | Paiement à réception du virement |

- Vitrine, boost et espace publicitaire restent **« en attente de paiement »** jusqu'à réception des fonds.
- En V1, l'administrateur active à la main. Le paiement en ligne automatisé est hors V1.
- Prix affichés en XPF, sans centimes.
- **[À décider]** : passerelle carte retenue, lieu de remise des espèces, critères d'entrée dans la liste des comptes habituels, TVA et mentions obligatoires d'une facture (à confirmer avec un expert-comptable).

### 5.8 Inscription [Acquis, valeurs à confirmer]

Gratuite, réservée aux annonceurs : un acheteur n'a pas besoin de compte.

| Champ | Règle |
|---|---|
| Type de compte | Particulier ou professionnel |
| Prénom ou nom de l'entreprise | 2 à 60 caractères [À confirmer] |
| E-mail | Sert à se connecter, jamais affiché. Un seul compte par e-mail |
| Téléphone | 8 chiffres |
| Mot de passe | 8 caractères au moins [À confirmer], saisi deux fois |
| Pro : numéro TAHITI | Obligatoire. Format exact à vérifier ; en attendant : lettres, chiffres, espaces et tirets, 20 caractères au plus |
| Pro : secteur, île, commune | Obligatoires |

**[À décider]** : confirmation de l'e-mail par un lien, conditions d'utilisation à accepter.

### 5.9 Pagination des listes [Acquis, pas encore construite]

Pages numérotées dans l'adresse (`?page=2`), 20 annonces par page [À confirmer], annonces boostées en tête de la première page de leur catégorie seulement, pas de défilement infini. L'accueil affiche 10 à 12 annonces par page, triées par date de création (3.1.1).

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

- **Mots de passe** : gérés par Supabase Auth, qui les hache. Jamais en clair. Les comptes de démonstration ont été retirés.
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
- Données lues dans Supabase (`annonces-donnees.ts`, `compte-donnees.ts`, `admin-donnees.ts`) ; règles en fonctions pures testées (`validation.ts`, `inscription.ts`, `annonces.ts`, `moderation.ts`).
- **Démo client** : un second projet Supabase (« hoko-demo ») contient des annonces et des vitrines d'exemple ; le même code s'y branche avec d'autres clés (`npm run dev:demo`). Toute migration s'applique aux deux projets.
- Actions serveur dans `web/src/app/actions.ts`.
- Tests **Vitest** dans `web/tests/` (annonces, comptes, dépôt, inscription).
- Polices Clash Display et Satoshi (fichiers locaux). Maquettes HTML dans `maquettes/`.

### 8.2 Choix techniques

| Sujet | Choix |
|---|---|
| Base de données | **[Acquis]** Supabase (PostgreSQL). Branché, projet en us-west-1 (Californie). Formule payante obligatoire en production (la formule gratuite se met en pause). Sécurité par ligne (RLS) active : chaque annonceur ne voit que ses annonces |
| Authentification | **[Acquis]** Supabase Auth. Remplace `session.ts`, `session-token.ts` et les comptes de démonstration de `accounts.ts`, via `@supabase/ssr`. Prévoir la limite d'essais de connexion, un service SMTP pour les e-mails de production et la compatibilité avec Next.js 16 |
| Stockage des photos | **[Acquis]** Supabase Storage. Règles d'accès par bucket ; le retrait des métadonnées GPS et le redimensionnement restent à écrire (le redimensionnement automatique dépend de la formule) |
| Paiement | Voir 5.7. Passerelle carte **[À décider]** : OSB/PayZen ou NiuPay |
| Hébergement du site | **[Acquis]** Vercel. Prix lié au trafic ; la formule gratuite interdit l'usage commercial. Au plus près de Supabase (San Francisco), choisie après mesure de la latence depuis Tahiti (côte ouest des États-Unis ou Sydney) |
| E-mails | **[Acquis]** Resend, branché en SMTP sur Supabase Auth : réinitialisation du mot de passe, validation d'annonce, rappel d'expiration. Exige un nom de domaine avec SPF et DKIM configurés, sinon les e-mails arrivent en courrier indésirable |
| Recherche | **[Acquis]** PostgreSQL (Supabase) au départ : recherche plein texte en français, `unaccent` (insensible aux accents), `pg_trgm` (tolère les fautes) et index. Les annonces pro restent exclues. Typesense ou Meilisearch si le volume l'exige |

### 8.3 Modèle de données cible [Proposé]

`utilisateurs` · `annonces` (statut, boost, date d'expiration) · `photos` · `categories` · `pros` (numéro TAHITI, statut de vérification, abonnement) · `contact_reveals` · `boosts` · `bons_de_commande` (numéro unique, à mettre en référence du virement) · `comptes_habituels` (pros autorisés à payer par bon de commande) · `paiements` · `reservations_pub` (accueil ou catégorie, exclusif ou rotation) · `signalements` · `journal_moderation`.

### 8.4 Règles de développement

- Une règle métier = une fonction pure testée. Pas de règle cachée dans un composant.
- Aucun accès aux données hors de `web/src/lib/`.
- Toute nouvelle page publique précise son titre, sa description et son état « vide » / « chargement » / « erreur ».
- `npm run lint` et `npm test` passent avant chaque fusion.
- Un changement de règle métier passe d'abord par la spécification interne (`SPEC.md`), puis **ce document** est mis à jour dans la même demande de fusion.

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

Classés par urgence : les premiers bloquent la phase 1. Les choix techniques sont décidés (8.2) : Supabase, Vercel, Resend, recherche PostgreSQL. Le paiement par carte reste à trancher.

| # | Question | Pourquoi c'est bloquant |
|---|---|---|
| 2 | Îles et catégories couvertes en V1 | Structure des filtres et du SEO |
| 3 | Nombre de photos par annonce (6 proposé) | Stockage et formulaire |
| 5 | Qui valide les annonces, et sous quel délai ? | Charge d'exploitation |
| 6 | Passerelle carte (OSB/PayZen ou NiuPay), lieu de remise des espèces, critères des comptes habituels, tarif de la publicité exclusive | Phase 3 |
| 6 bis | TVA et mentions obligatoires d'une facture, à confirmer avec un expert-comptable | Phase 3 |
| 7 | Procédure de vérification d'un pro (justificatifs TAHITI) | Phase 3 |
| 8 | Cadre juridique et données personnelles | Avant toute ouverture |
| 9 | Niveau de disponibilité visé. Région décidée : us-west-1, Californie (125 ms depuis Tahiti, contre 236 ms pour Séoul et 261 ms pour Sydney) | Coût |
| 10 | Nom de domaine et exploitant légal du site | Mentions légales, et **bloque l'envoi d'e-mails** (SPF, DKIM de Resend) |

---

## 13. Maintenance de ce document

- Une décision prise → passer l'étiquette de **[À décider]** à **[Acquis]** et retirer la ligne de la section 12.
- Une fonction livrée → mettre à jour la colonne « État » de la section 3.
- Ce document suit la spécification interne (`SPEC.md`) : en cas d'écart, c'est elle qui fait foi et ce document est corrigé.
