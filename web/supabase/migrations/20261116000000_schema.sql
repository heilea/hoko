-- Hoko : schéma de départ (SPEC.md, section 7).
--
-- À exécuter une seule fois sur un projet Supabase neuf : éditeur SQL du tableau de bord,
-- ou `supabase db push` avec l'outil en ligne de commande.
--
-- Principe de sécurité : la sécurité par ligne (RLS) est activée sur toutes les tables.
-- Ce que tout le monde peut lire est dans les tables publiques (annonces actives, vitrines
-- actives, catégories). Ce qui est privé est dans des tables à part (`profiles`,
-- `shop_private`) que seuls le titulaire et l'administrateur peuvent lire : le téléphone et
-- le numéro TAHITI ne partent donc jamais dans une lecture publique.
--
-- Les décisions de l'administrateur (statut d'une annonce ou d'une vitrine, badge, boost) ne
-- sont modifiables par aucun compte connecté, administrateur compris : elles passeront par le
-- serveur du site, avec la clé secrète, après vérification du rôle. Cela évite qu'une erreur
-- dans une règle laisse un annonceur valider sa propre annonce.

-- ───────────────────────── Comptes ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'particulier' check (role in ('particulier', 'pro', 'admin')),
  -- Prénom du particulier, ou nom de l'entreprise
  nom text not null check (char_length(nom) between 2 and 60),
  -- Format « 87 12 34 56 ». Privé : servi seulement au clic sur « Voir le numéro ».
  telephone text not null check (telephone ~ '^\d{2} \d{2} \d{2} \d{2}$'),
  created_at timestamptz not null default now()
);

-- Indique si la personne connectée est administrateur. `security definer` : la fonction lit
-- `profiles` sans repasser par ses règles, ce qui évite une boucle dans les règles ci-dessous.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- À l'inscription, Supabase Auth crée la ligne dans auth.users ; ce déclencheur crée le profil
-- à partir des informations du formulaire. Le rôle « admin » ne peut jamais venir du formulaire.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, role, nom, telephone)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'type' = 'pro' then 'pro' else 'particulier' end,
    new.raw_user_meta_data ->> 'nom',
    new.raw_user_meta_data ->> 'telephone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Catégories ─────────────────────────

create table public.categories (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nom text not null,
  description text not null default '',
  icone text not null,
  ordre smallint not null default 0
);

-- Liste provisoire : les catégories de la V1 restent à confirmer.
insert into public.categories (slug, nom, icone, description, ordre) values
  ('vehicules', 'Véhicules', 'vehicules', 'Voitures, scooters, pick-up et pièces détachées.', 1),
  ('immobilier', 'Immobilier', 'immobilier', 'Locations, ventes et terrains, de Tahiti aux îles.', 2),
  ('emploi', 'Emploi', 'emploi', 'Offres et demandes d''emploi.', 3),
  ('services', 'Services', 'services', 'Plomberie, jardinage, cours et dépannage.', 4),
  ('maison', 'Maison', 'maison', 'Meubles, électroménager et outils.', 5),
  ('multimedia', 'Multimédia', 'multimedia', 'Téléphones, ordinateurs et consoles.', 6),
  ('mode', 'Mode', 'mode', 'Vêtements, bijoux et accessoires.', 7),
  ('sports', 'Sports', 'sports', 'Vélos, surf, instruments et loisirs.', 8),
  ('nautisme', 'Nautisme', 'nautisme', 'Bateaux, pirogues et moteurs.', 9),
  ('animaux', 'Animaux', 'animaux', 'Adoptions et accessoires pour animaux.', 10);

-- ───────────────────────── Vitrines des pros ─────────────────────────

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nom text not null check (char_length(nom) between 2 and 60),
  secteur text not null,
  category_id smallint not null references public.categories (id),
  -- Texte libre : la liste des îles couvertes en V1 reste à décider
  ile text not null,
  commune text not null check (char_length(commune) <= 60),
  presentation text not null default '',
  horaires text[] not null default '{}',
  -- Badge « Pro vérifié » : accordé par l'administrateur après contrôle du numéro TAHITI
  verifie boolean not null default false,
  statut text not null default 'en_attente_paiement'
    check (statut in ('en_attente_paiement', 'actif', 'suspendu')),
  created_at timestamptz not null default now()
);

-- Informations privées d'une vitrine : jamais lues par le public
create table public.shop_private (
  shop_id uuid primary key references public.shops (id) on delete cascade,
  -- Format exact à vérifier (SPEC.md, section 4 quater)
  numero_tahiti text not null check (char_length(numero_tahiti) <= 20),
  telephone text not null check (telephone ~ '^\d{2} \d{2} \d{2} \d{2}$')
);

-- ───────────────────────── Annonces ─────────────────────────

create table public.listings (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Renseigné pour une annonce pro : elle ne vit que dans la vitrine
  shop_id uuid references public.shops (id) on delete cascade,
  category_id smallint not null references public.categories (id),
  titre text not null check (char_length(titre) between 1 and 80),
  description text not null check (char_length(description) between 20 and 2000),
  -- Prix en XPF, sans centimes, obligatoire et supérieur à zéro
  prix_xpf integer not null check (prix_xpf > 0),
  suffixe_prix text,
  ile text not null,
  commune text not null check (char_length(commune) <= 60),
  -- Prénom du vendeur ou nom du pro, recopié ici pour être lisible sans ouvrir `profiles`
  vendeur_nom text not null,
  statut text not null default 'en_attente_validation'
    check (statut in ('en_attente_validation', 'active', 'refusee', 'retiree')),
  motif_refus text,
  -- Boost actif tant que cette date n'est pas passée
  boost_jusqu_au timestamptz,
  created_at timestamptz not null default now(),
  -- Un pro ne peut pas booster
  constraint boost_reserve_aux_particuliers check (shop_id is null or boost_jusqu_au is null)
);

create index listings_publiques_idx on public.listings (category_id, created_at desc) where statut = 'active';
create index listings_user_idx on public.listings (user_id);
create index listings_shop_idx on public.listings (shop_id) where shop_id is not null;

-- Limites d'annonces actives : 5 pour un particulier, 20 pour la vitrine d'un pro.
-- Vérifiées au moment où une annonce devient active, quel que soit l'auteur du changement.
create function public.verifier_limite_annonces() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actives integer;
begin
  if new.statut <> 'active' or (tg_op = 'UPDATE' and old.statut = 'active') then
    return new;
  end if;

  if new.shop_id is null then
    select count(*) into actives from public.listings
      where user_id = new.user_id and shop_id is null and statut = 'active';
    if actives >= 5 then
      raise exception 'Limite atteinte : un particulier a 5 annonces actives au plus.'
        using errcode = 'check_violation';
    end if;
  else
    select count(*) into actives from public.listings
      where shop_id = new.shop_id and statut = 'active';
    if actives >= 20 then
      raise exception 'Limite atteinte : une vitrine a 20 annonces actives au plus.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger listings_limite
  before insert or update of statut on public.listings
  for each row execute function public.verifier_limite_annonces();

create table public.photos (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings (id) on delete cascade,
  -- Chemin du fichier dans le stockage (JPEG, 4 Mo au plus)
  chemin text not null,
  ordre smallint not null default 0
);

create index photos_listing_idx on public.photos (listing_id, ordre);

create table public.boosts (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings (id) on delete cascade,
  montant_xpf integer not null check (montant_xpf > 0),
  statut text not null default 'en_attente_paiement'
    check (statut in ('en_attente_paiement', 'actif', 'termine', 'annule')),
  debut timestamptz,
  fin timestamptz,
  created_at timestamptz not null default now()
);

-- Un enregistrement par clic sur « Voir le numéro » : statistique « contacts reçus »
create table public.contact_reveals (
  id bigint generated always as identity primary key,
  listing_id bigint references public.listings (id) on delete cascade,
  shop_id uuid references public.shops (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (listing_id is not null or shop_id is not null)
);

create index contact_reveals_listing_idx on public.contact_reveals (listing_id);
create index contact_reveals_shop_idx on public.contact_reveals (shop_id);

-- ───────────────────────── Publicité et paiements ─────────────────────────

create table public.ad_slots (
  id bigint generated always as identity primary key,
  emplacement text not null check (emplacement in ('accueil', 'categorie')),
  category_id smallint references public.categories (id),
  mode text not null default 'exclusif' check (mode in ('exclusif', 'rotation')),
  annonceur text not null,
  visuel text,
  lien text,
  debut date not null,
  fin date not null,
  statut text not null default 'en_attente_paiement'
    check (statut in ('en_attente_paiement', 'actif', 'termine', 'annule')),
  check (fin >= debut),
  -- Un espace de catégorie est lié à sa catégorie ; celui de l'accueil ne l'est pas
  check ((emplacement = 'categorie') = (category_id is not null))
);

-- Pros autorisés à payer par bon de commande (liste validée par l'administrateur)
create table public.customer_accounts_b2b (
  shop_id uuid primary key references public.shops (id) on delete cascade,
  valide_par_admin boolean not null default false,
  date_validation timestamptz
);

create table public.purchase_orders (
  id bigint generated always as identity primary key,
  shop_id uuid not null references public.shops (id) on delete cascade,
  -- À mettre en référence du virement
  numero text not null unique,
  montant_xpf integer not null check (montant_xpf > 0),
  statut text not null default 'emis' check (statut in ('emis', 'paye', 'annule')),
  date_emission timestamptz not null default now(),
  date_paiement timestamptz
);

-- ───────────────────────── Règles d'accès (RLS) ─────────────────────────

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.shops enable row level security;
alter table public.shop_private enable row level security;
alter table public.listings enable row level security;
alter table public.photos enable row level security;
alter table public.boosts enable row level security;
alter table public.contact_reveals enable row level security;
alter table public.ad_slots enable row level security;
alter table public.customer_accounts_b2b enable row level security;
alter table public.purchase_orders enable row level security;

-- Profil : chacun lit et corrige le sien ; l'administrateur lit tout.
create policy "profil : lecture du sien" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "profil : modification du sien" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Seuls le nom et le téléphone sont modifiables : personne ne change son propre rôle.
revoke update on public.profiles from authenticated, anon;
grant update (nom, telephone) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated, anon;

-- Catégories : lecture par tous, gestion par l'administrateur.
create policy "catégories : lecture par tous" on public.categories
  for select to anon, authenticated using (true);
create policy "catégories : gestion par l'administrateur" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Vitrines : le public voit les vitrines actives et vérifiées ; le pro voit la sienne.
create policy "vitrines : lecture publique" on public.shops
  for select to anon, authenticated
  using ((statut = 'actif' and verifie) or user_id = (select auth.uid()) or public.is_admin());
create policy "vitrines : création par un pro" on public.shops
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and statut = 'en_attente_paiement'
    and not verifie
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'pro')
  );
create policy "vitrines : modification par le pro" on public.shops
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "vitrines : gestion par l'administrateur" on public.shops
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Le pro ne change ni son statut ni son badge : ce sont les décisions de l'administrateur.
revoke update on public.shops from authenticated, anon;
grant update (nom, secteur, category_id, ile, commune, presentation, horaires) on public.shops to authenticated;

create policy "vitrine privée : lecture par le pro" on public.shop_private
  for select to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.user_id = (select auth.uid())) or public.is_admin());
create policy "vitrine privée : création par le pro" on public.shop_private
  for insert to authenticated
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.user_id = (select auth.uid())));
create policy "vitrine privée : gestion par l'administrateur" on public.shop_private
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Annonces : le public voit les annonces actives ; l'annonceur voit toutes les siennes.
create policy "annonces : lecture publique" on public.listings
  for select to anon, authenticated
  using (statut = 'active' or user_id = (select auth.uid()) or public.is_admin());
-- Une annonce déposée attend toujours la validation, sans boost.
create policy "annonces : dépôt" on public.listings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and statut = 'en_attente_validation'
    and boost_jusqu_au is null
    and (shop_id is null or exists (select 1 from public.shops s where s.id = shop_id and s.user_id = (select auth.uid())))
  );
create policy "annonces : modification par l'annonceur" on public.listings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "annonces : gestion par l'administrateur" on public.listings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- L'annonceur corrige le contenu, jamais le statut ni le boost.
revoke update on public.listings from authenticated, anon;
grant update (category_id, titre, description, prix_xpf, suffixe_prix, ile, commune) on public.listings to authenticated;

-- Photos : visibles avec leur annonce ; gérées par l'annonceur.
create policy "photos : lecture avec l'annonce" on public.photos
  for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));
create policy "photos : gestion par l'annonceur" on public.photos
  for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.user_id = (select auth.uid())));
create policy "photos : gestion par l'administrateur" on public.photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Boosts : l'annonceur suit les siens ; l'administrateur les active à réception du paiement.
create policy "boosts : lecture par l'annonceur" on public.boosts
  for select to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.user_id = (select auth.uid())) or public.is_admin());
create policy "boosts : gestion par l'administrateur" on public.boosts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Contacts reçus : l'annonceur lit ceux de ses annonces et de sa vitrine. L'enregistrement
-- d'un clic se fera par une fonction du serveur, pas par une écriture directe.
create policy "contacts : lecture par l'annonceur" on public.contact_reveals
  for select to authenticated
  using (
    exists (select 1 from public.listings l where l.id = listing_id and l.user_id = (select auth.uid()))
    or exists (select 1 from public.shops s where s.id = shop_id and s.user_id = (select auth.uid()))
    or public.is_admin()
  );

-- Publicité : le public voit les espaces actifs à la date du jour.
create policy "publicité : lecture des espaces actifs" on public.ad_slots
  for select to anon, authenticated
  using ((statut = 'actif' and current_date between debut and fin) or public.is_admin());
create policy "publicité : gestion par l'administrateur" on public.ad_slots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Bons de commande et comptes habituels : le pro lit les siens, l'administrateur gère.
create policy "comptes habituels : lecture par le pro" on public.customer_accounts_b2b
  for select to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.user_id = (select auth.uid())) or public.is_admin());
create policy "comptes habituels : gestion par l'administrateur" on public.customer_accounts_b2b
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "bons de commande : lecture par le pro" on public.purchase_orders
  for select to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.user_id = (select auth.uid())) or public.is_admin());
create policy "bons de commande : gestion par l'administrateur" on public.purchase_orders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
