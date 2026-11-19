-- Boost : le compte administrateur publie comme un particulier ; il peut donc aussi booster.
-- Seuls les comptes pro (et les annonces de vitrine) restent exclus.
create or replace function public.commander_boost(annonce_id bigint)
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
     or not exists (select 1 from public.profiles p where p.id = a.user_id and p.role <> 'pro') then
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
