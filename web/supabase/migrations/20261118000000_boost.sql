-- Boost d'une annonce de particulier (SPEC.md, section 1, décidé le 18 novembre 2026)
--
-- - 3 boosts au plus par catégorie, garantis en tête (pas de rotation). Une place est prise
--   par un boost actif (fin non passée) ou en attente de paiement.
-- - 2 boosts au plus à la fois par particulier (actifs ou en attente).
-- - Seule une annonce en ligne, sans boost en cours ni en attente, peut être boostée.
-- - Les 7 jours commencent à l'activation par l'administrateur (réception du paiement).
-- - Prix par catégorie, dans `boost_tarifs` (700 XPF partout au lancement). Le prix payé est
--   recopié sur la commande. Chaque tentative tombée sur « Complet » est comptée.

-- ───────────────── 1. Tarifs par catégorie ─────────────────

create table public.boost_tarifs (
  category_id smallint primary key references public.categories (id) on delete cascade,
  prix_xpf integer not null check (prix_xpf > 0),
  modifie_le timestamptz not null default now()
);

insert into public.boost_tarifs (category_id, prix_xpf)
select id, 700 from public.categories;

alter table public.boost_tarifs enable row level security;
-- Les prix sont publics. Ils se changent depuis le tableau de bord Supabase, jamais depuis le site.
create policy "tarifs du boost : lecture publique" on public.boost_tarifs
  for select to anon, authenticated using (true);

-- ───────────────── 2. Tentatives tombées sur « Complet » ─────────────────

create table public.boost_complets (
  id bigint generated always as identity primary key,
  category_id smallint not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index boost_complets_categorie_idx on public.boost_complets (category_id, created_at);

alter table public.boost_complets enable row level security;
-- Écrite seulement par commander_boost ; lue par l'administrateur.
create policy "complets du boost : lecture par l'administrateur" on public.boost_complets
  for select to authenticated using ((select private.is_admin()));

create index boosts_statut_idx on public.boosts (statut, fin);

-- ───────────────── 3. Places prises dans une catégorie ─────────────────

/** Boosts qui occupent une place : actifs non terminés, ou en attente de paiement. */
create function private.boosts_occupes(categorie smallint)
returns table (fin timestamptz)
language sql stable security definer set search_path = ''
as $$
  select b.fin
    from public.boosts b
    join public.listings l on l.id = b.listing_id
   where l.category_id = categorie
     and (b.statut = 'en_attente_paiement' or (b.statut = 'actif' and b.fin > now()));
$$;

revoke execute on function private.boosts_occupes(smallint) from public, anon, authenticated;

/**
 * Ce que voit le particulier avant de commander : prix de la catégorie, places prises,
 * prochaine place libre (fin du boost actif le plus proche ; null si une commande en attente
 * bloque la place sans date), et la commande en cours sur cette annonce, s'il y en a une.
 */
create function public.etat_boost(annonce_id bigint)
returns table (
  prix_xpf integer,
  places_prises integer,
  places integer,
  libre_le timestamptz,
  commande_id bigint,
  commande_statut text,
  commande_fin timestamptz,
  commande_montant integer
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  a public.listings%rowtype;
begin
  select * into a from public.listings where id = annonce_id and user_id = (select auth.uid());
  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;
  return query
    select coalesce((select t.prix_xpf from public.boost_tarifs t where t.category_id = a.category_id), 700),
           (select count(*)::integer from private.boosts_occupes(a.category_id)),
           3,
           (select min(o.fin) from private.boosts_occupes(a.category_id) o),
           b.id, b.statut, b.fin, b.montant_xpf
      from (select 1) x
      left join lateral (
        select bb.id, bb.statut, bb.fin, bb.montant_xpf
          from public.boosts bb
         where bb.listing_id = a.id
           and (bb.statut = 'en_attente_paiement' or (bb.statut = 'actif' and bb.fin > now()))
         order by bb.created_at desc
         limit 1
      ) b on true;
end;
$$;

-- ───────────────── 4. Commande par le particulier ─────────────────

/**
 * Commande un boost. Ne lève pas d'erreur quand c'est complet : la tentative doit rester
 * comptée (une erreur annulerait l'enregistrement). Renvoie :
 * - statut « commande » : commande créée, en attente de paiement (id et montant) ;
 * - statut « complet » : les 3 places de la catégorie sont prises (libre_le : prochaine place) ;
 * - statut « max_compte » : le particulier a déjà 2 boosts actifs ou en attente.
 * Les autres refus (annonce introuvable, pas en ligne, compte pro, boost déjà en cours) sont
 * des erreurs.
 */
create function public.commander_boost(annonce_id bigint)
returns table (statut text, commande_id bigint, montant_xpf integer, libre_le timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  a public.listings%rowtype;
  prix integer;
  nouvelle bigint;
begin
  select * into a from public.listings
   where id = annonce_id and user_id = (select auth.uid())
   for update;
  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;
  if a.shop_id is not null
     or not exists (select 1 from public.profiles p where p.id = a.user_id and p.role = 'particulier') then
    raise exception 'Le boost est réservé aux particuliers.' using errcode = '42501';
  end if;
  if a.statut <> 'active' or (a.expire_le is not null and a.expire_le <= now()) then
    raise exception 'Seule une annonce en ligne peut être boostée.' using errcode = '22023', hint = 'pas_en_ligne';
  end if;
  if exists (
    select 1 from public.boosts b
     where b.listing_id = a.id
       and (b.statut = 'en_attente_paiement' or (b.statut = 'actif' and b.fin > now()))
  ) then
    raise exception 'Cette annonce a déjà un boost en cours ou en attente.' using errcode = '22023', hint = 'deja';
  end if;

  -- Une commande à la fois par catégorie, pour ne jamais dépasser les 3 places
  perform pg_advisory_xact_lock(hashtext('boost'), a.category_id);

  if (select count(*)
        from public.boosts b
        join public.listings l on l.id = b.listing_id
       where l.user_id = a.user_id
         and (b.statut = 'en_attente_paiement' or (b.statut = 'actif' and b.fin > now()))) >= 2 then
    return query select 'max_compte'::text, null::bigint, null::integer, null::timestamptz;
    return;
  end if;

  if (select count(*) from private.boosts_occupes(a.category_id)) >= 3 then
    insert into public.boost_complets (category_id) values (a.category_id);
    return query select 'complet'::text, null::bigint, null::integer, (select min(o.fin) from private.boosts_occupes(a.category_id) o);
    return;
  end if;

  prix := coalesce((select t.prix_xpf from public.boost_tarifs t where t.category_id = a.category_id), 700);
  insert into public.boosts (listing_id, montant_xpf) values (a.id, prix) returning id into nouvelle;
  return query select 'commande'::text, nouvelle, prix, null::timestamptz;
end;
$$;

/** Le particulier annule sa commande tant qu'elle n'est pas payée. */
create function public.annuler_boost(boost_id bigint)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.boosts b set statut = 'annule'
   where b.id = boost_id
     and b.statut = 'en_attente_paiement'
     and exists (select 1 from public.listings l where l.id = b.listing_id and l.user_id = (select auth.uid()));
  if not found then
    raise exception 'Commande introuvable ou déjà payée.' using errcode = 'P0002';
  end if;
end;
$$;

-- ───────────────── 5. Administration ─────────────────

/**
 * Boosts en attente de paiement (les plus anciens d'abord), puis les boosts actifs, pour
 * l'administrateur, avec l'e-mail et le téléphone du compte pour le contacter.
 */
create function public.boosts_admin()
returns table (
  id bigint,
  statut text,
  montant_xpf integer,
  debut timestamptz,
  fin timestamptz,
  commande_le timestamptz,
  annonce_id bigint,
  titre text,
  annonce_statut text,
  categorie text,
  vendeur text,
  telephone text,
  email text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Réservé à l''administrateur.' using errcode = '42501';
  end if;
  return query
    select b.id, b.statut, b.montant_xpf, b.debut, b.fin, b.created_at,
           l.id, l.titre, l.statut, c.nom, p.nom, p.telephone, u.email::text
      from public.boosts b
      join public.listings l on l.id = b.listing_id
      join public.categories c on c.id = l.category_id
      join public.profiles p on p.id = l.user_id
      left join auth.users u on u.id = l.user_id
     where b.statut = 'en_attente_paiement' or (b.statut = 'actif' and b.fin > now())
     order by (b.statut = 'en_attente_paiement') desc, b.created_at asc
     limit 200;
end;
$$;

/**
 * Décision de l'administrateur : « activer » (paiement reçu : 7 jours à partir de maintenant,
 * l'annonce doit être en ligne) ou « annuler » (commande non payée).
 */
create function public.decider_boost(boost_id bigint, geste text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  b public.boosts%rowtype;
  a public.listings%rowtype;
begin
  if not private.is_admin() then
    raise exception 'Réservé à l''administrateur.' using errcode = '42501';
  end if;
  select * into b from public.boosts where id = boost_id for update;
  if not found or b.statut <> 'en_attente_paiement' then
    raise exception 'Commande introuvable ou déjà traitée.' using errcode = 'P0002';
  end if;

  if geste = 'activer' then
    select * into a from public.listings where id = b.listing_id for update;
    if a.statut <> 'active' or (a.expire_le is not null and a.expire_le <= now()) then
      raise exception 'L''annonce n''est plus en ligne.' using errcode = '22023', hint = 'pas_en_ligne';
    end if;
    update public.boosts set statut = 'actif', debut = now(), fin = now() + interval '7 days' where id = b.id;
    -- Le déclencheur listings_prolonger_pour_boost repousse la fin de l'annonce si besoin
    update public.listings set boost_jusqu_au = now() + interval '7 days' where id = a.id;
  elsif geste = 'annuler' then
    update public.boosts set statut = 'annule' where id = b.id;
  else
    raise exception 'Geste inconnu : %', geste using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.etat_boost(bigint) from public, anon;
revoke execute on function public.commander_boost(bigint) from public, anon;
revoke execute on function public.annuler_boost(bigint) from public, anon;
revoke execute on function public.boosts_admin() from public, anon;
revoke execute on function public.decider_boost(bigint, text) from public, anon;
grant execute on function public.etat_boost(bigint) to authenticated;
grant execute on function public.commander_boost(bigint) to authenticated;
grant execute on function public.annuler_boost(bigint) to authenticated;
grant execute on function public.boosts_admin() to authenticated;
grant execute on function public.decider_boost(bigint, text) to authenticated;
