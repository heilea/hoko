# Hoko : site web

Petites annonces pour la Polynésie française. Next.js 16 (App Router), TypeScript, Supabase (base de données et comptes), hébergé sur Vercel.

## Lancer en local

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
```

Autres commandes :

| Commande | Rôle |
|---|---|
| `npm test` | Tests (Vitest) |
| `npm run lint` | Vérification du code |
| `npm run build` | Construction de production |
| `npm run dev:demo` | Démo client sur http://localhost:3001, branchée sur la base de démo (fichier `.env.demo`) |
| `npm run supabase:verifier` | Vérifie la connexion à la base |

## Bases Supabase

Deux projets Supabase, dans la région us-west-1 :

- **hoko** : la vraie base ;
- **hoko-demo** : la base de démonstration, remplie une seule fois avec `supabase/demo/donnees-demo.sql`. Ce fichier ne doit jamais être exécuté sur la vraie base.

Le schéma est dans `supabase/migrations/`. Toute nouvelle migration s'applique **aux deux projets**, puis les types de `src/lib/database.types.ts` sont régénérés.

## Mise en ligne sur Vercel

Deux projets Vercel, construits à partir du même dépôt. Chaque fusion sur `main` les remet à jour.

| Projet Vercel | Base Supabase | Adresse |
|---|---|---|
| `hoko` | hoko | https://hoko-five.vercel.app |
| `hoko-demo` | hoko-demo | https://hoko-demo.vercel.app |

### Réglages de chaque projet Vercel

- **Root Directory** : `web`. Sans ce réglage, la construction échoue.
- **Variables d'environnement** :
  - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : ceux de la base correspondante ;
  - `SUPABASE_SECRET_KEY` : la clé secrète de la base correspondante (sans préfixe `NEXT_PUBLIC_`). Le serveur s'en sert seulement pour déposer et effacer les photos ; sans elle, l'envoi de photos est indisponible ;
  - `SITE_URL` : l'adresse fixe du projet, avec `https://` et sans `/` final.
  - Ni la clé secrète de Supabase ni `HOKO_DIST_DIR`, qui ne sert qu'en local.
- Après une modification de variable : **Redeploy**. Une variable ne compte qu'à partir du déploiement suivant.
- L'adresse fixe se trouve dans **Settings > Domains**. Les adresses propres à chaque déploiement (`hoko-xxxx.vercel.app`) changent à chaque fois : ne pas les partager.

### Réglages de chaque projet Supabase

Dans **Authentication > URL Configuration** :

- **Site URL** : l'adresse fixe du site ;
- **Redirect URLs** : `https://<adresse du site>/**`, et `http://localhost:3000/**` pour travailler en local.

Sans le `/**` final, Supabase refuse l'adresse de retour (`/auth/confirmation?suite=…`) et renvoie sur l'accueil : le lien de confirmation ou de nouveau mot de passe ne mène plus à la bonne page.

### Limites actuelles des e-mails

L'envoi intégré de Supabase sert pour l'instant :

- il n'écrit qu'aux membres de l'équipe Supabase, et seulement quelques e-mails par heure ;
- ses modèles d'e-mail ne se modifient pas. Le lien reçu doit donc être ouvert dans le navigateur qui a fait la demande, puisque la vérification passe par un cookie.

Avant l'ouverture au public : brancher Resend avec le nom de domaine de Hoko (SMTP personnalisé). Il faudra ensuite adapter les modèles pour que les liens marchent depuis n'importe quel appareil, et mettre à jour `SITE_URL` et les adresses de retour.
