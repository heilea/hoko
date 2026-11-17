-- Hoko : vie d'une annonce de particulier (SPEC.md, section 4 quinquies).
--
-- 30 jours en ligne à partir de la validation. L'annonceur peut marquer son annonce
-- « vendue », la retirer, la republier, ou la modifier (elle repasse alors par la validation).
--
-- Une annonce expirée garde le statut « active » avec une date `expire_le` passée : elle quitte
-- le site d'elle-même à l'heure dite, sans tâche planifiée. Le site l'affiche « expirée » à son
-- propriétaire. Une annonce de vitrine n'a pas de date de fin (expire_le vide) : elle suit sa
-- vitrine, en attendant une décision sur la durée des annonces pro.

-- ───────────────── Colonnes et statuts ─────────────────

alter table public.listings
  add column expire_le timestamptz,
  -- Fin de vie (vendue ou retirée) : servira à effacer les photos 30 jours plus tard
  add column termine_le timestamptz;

alter table public.listings drop constraint listings_statut_check;
alter table public.listings add constraint listings_statut_check
  check (statut in ('en_attente_validation', 'active', 'refusee', 'retiree', 'vendue'));

-- Annonces de particuliers déjà en ligne : 30 jours à partir d'aujourd'hui
update public.listings
   set expire_le = now() + interval '30 days'
 where statut = 'active' and shop_id is null;

-- ───────────────── En ligne = active et pas expirée ─────────────────

drop policy "annonces : lecture publique" on public.listings;
create policy "annonces : lecture publique" on public.listings
  for select to anon, authenticated
  using (
    (statut = 'active' and (expire_le is null or expire_le > now()))
    or user_id = (select auth.uid())
    or private.is_admin()
  );

create or replace function public.voir_numero_annonce(annonce_id bigint)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  numero text;
begin
  select coalesce(sp.telephone, p.telephone) into numero
    from public.listings l
    join public.profiles p on p.id = l.user_id
    left join public.shops s on s.id = l.shop_id
    left join public.shop_private sp on sp.shop_id = l.shop_id
   where l.id = annonce_id
     and l.statut = 'active'
     and (l.expire_le is null or l.expire_le > now())
     -- Une annonce pro ne donne son numéro que si sa vitrine est en ligne
     and (l.shop_id is null or (s.statut = 'actif' and s.verifie));
  if numero is null then
    return null;
  end if;
  insert into public.contact_reveals (listing_id) values (annonce_id);
  return numero;
end;
$$;

create or replace function public.rechercher_annonces(recherche text)
returns setof public.listings
language sql stable security invoker set search_path = ''
as $$
  select l.*
    from public.listings l
    join public.categories c on c.id = l.category_id
   where l.statut = 'active'
     and (l.expire_le is null or l.expire_le > now())
     and l.shop_id is null
     and extensions.unaccent(lower(l.titre || ' ' || c.nom || ' ' || l.commune || ' ' || l.ile))
         like '%' || replace(replace(replace(extensions.unaccent(lower(trim(recherche))), '\', '\\'), '%', '\%'), '_', '\_') || '%'
   order by l.created_at desc
   limit 100;
$$;

-- ───────────────── Limites : seules les annonces en ligne comptent ─────────────────
-- Vérifiées chaque fois qu'une annonce revient en ligne : validation, republication.

create or replace function public.verifier_limite_annonces() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actives integer;
  en_ligne boolean := new.statut = 'active' and (new.expire_le is null or new.expire_le > now());
  deja_en_ligne boolean := tg_op = 'UPDATE' and old.statut = 'active' and (old.expire_le is null or old.expire_le > now());
begin
  if not en_ligne or deja_en_ligne then
    return new;
  end if;

  if new.shop_id is null then
    select count(*) into actives from public.listings
      where user_id = new.user_id and shop_id is null and id is distinct from new.id
        and statut = 'active' and (expire_le is null or expire_le > now());
    if actives >= 5 then
      raise exception 'Limite atteinte : un particulier a 5 annonces actives au plus.'
        using errcode = 'check_violation';
    end if;
  else
    select count(*) into actives from public.listings
      where shop_id = new.shop_id and id is distinct from new.id and statut = 'active';
    if actives >= 20 then
      raise exception 'Limite atteinte : une vitrine a 20 annonces actives au plus.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

drop trigger listings_limite on public.listings;
create trigger listings_limite
  before insert or update of statut, expire_le on public.listings
  for each row execute function public.verifier_limite_annonces();

-- ───────────────── Boost : l'annonce dure au moins jusqu'à la fin du boost ─────────────────

create function public.prolonger_pour_boost() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.boost_jusqu_au is not null and new.expire_le is not null and new.boost_jusqu_au > new.expire_le then
    new.expire_le := new.boost_jusqu_au;
  end if;
  return new;
end;
$$;

create trigger listings_prolonger_pour_boost
  before update of boost_jusqu_au, expire_le on public.listings
  for each row execute function public.prolonger_pour_boost();

revoke execute on function public.prolonger_pour_boost() from public, anon, authenticated;

-- ───────────────── Validation : 30 jours à partir de la décision ─────────────────

create or replace function public.moderer_annonce(annonce_id bigint, decision text, motif text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  motif_net text := nullif(trim(coalesce(motif, '')), '');
begin
  if not private.is_admin() then
    raise exception 'Réservé à l''administrateur.' using errcode = '42501';
  end if;
  if decision not in ('active', 'refusee') then
    raise exception 'Décision inconnue : %', decision using errcode = '22023';
  end if;
  if decision = 'refusee' and (motif_net is null or char_length(motif_net) < 5) then
    raise exception 'Un refus doit être motivé (5 caractères au moins).' using errcode = '22023';
  end if;
  if char_length(coalesce(motif_net, '')) > 500 then
    raise exception 'Le motif dépasse 500 caractères.' using errcode = '22023';
  end if;

  update public.listings
     set statut = decision,
         motif_refus = case when decision = 'refusee' then motif_net end,
         -- Annonce de particulier validée : 30 jours en ligne. Une annonce de vitrine n'expire pas.
         expire_le = case when decision = 'active' and shop_id is null then now() + interval '30 days' end,
         modere_par = (select auth.uid()),
         modere_le = now()
   where id = annonce_id
     and statut = 'en_attente_validation';

  if not found then
    raise exception 'Annonce introuvable ou déjà traitée.' using errcode = 'P0002';
  end if;
end;
$$;

-- ───────────────── Gestes de l'annonceur ─────────────────
-- L'annonceur ne change jamais son statut par une écriture directe : il passe par ces deux
-- fonctions, qui vérifient qu'il est bien le propriétaire et que le geste est permis.

/**
 * « vendue » : annonce en ligne → vendue, quitte le site.
 * « retirer » : annonce en ligne ou en attente → retirée, quitte le site.
 * « republier » : annonce vendue, retirée ou expirée → 30 nouveaux jours en ligne ; une annonce
 *   jamais validée (retirée pendant l'attente) retourne en attente de validation.
 * Renvoie le nouveau statut. La limite de 5 annonces est vérifiée par le déclencheur.
 */
create function public.gerer_annonce(annonce_id bigint, geste text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  a public.listings%rowtype;
  en_ligne boolean;
  expiree boolean;
begin
  select * into a from public.listings
   where id = annonce_id and user_id = (select auth.uid())
   for update;
  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;

  en_ligne := a.statut = 'active' and (a.expire_le is null or a.expire_le > now());
  expiree := a.statut = 'active' and a.expire_le <= now();

  if geste = 'vendue' then
    if not en_ligne then
      raise exception 'Seule une annonce en ligne peut être marquée vendue.' using errcode = '22023';
    end if;
    update public.listings set statut = 'vendue', termine_le = now() where id = a.id;
    return 'vendue';

  elsif geste = 'retirer' then
    if not (en_ligne or a.statut = 'en_attente_validation') then
      raise exception 'Seule une annonce en ligne ou en attente peut être retirée.' using errcode = '22023';
    end if;
    update public.listings set statut = 'retiree', termine_le = now() where id = a.id;
    return 'retiree';

  elsif geste = 'republier' then
    if not (expiree or a.statut in ('vendue', 'retiree')) then
      raise exception 'Seule une annonce vendue, retirée ou expirée peut être republiée.' using errcode = '22023';
    end if;
    if a.modere_le is null then
      update public.listings
         set statut = 'en_attente_validation', expire_le = null, termine_le = null
       where id = a.id;
      return 'en_attente_validation';
    end if;
    update public.listings
       set statut = 'active',
           expire_le = case when a.shop_id is null then now() + interval '30 days' end,
           termine_le = null
     where id = a.id;
    return 'active';

  else
    raise exception 'Geste inconnu : %', geste using errcode = '22023';
  end if;
end;
$$;

/**
 * Modifie le contenu d'une annonce. Elle repasse en attente de validation et quitte le site le
 * temps de la vérification ; à la validation, ses 30 jours repartent. Un refus précédent est
 * effacé : l'annonce corrigée est soumise de nouveau.
 */
create function public.modifier_annonce(
  annonce_id bigint,
  categorie text,
  titre text,
  description text,
  prix_xpf integer,
  ile text,
  commune text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  categorie_id smallint;
begin
  select c.id into categorie_id from public.categories c where c.slug = categorie;
  if categorie_id is null then
    raise exception 'Catégorie inconnue.' using errcode = '22023';
  end if;

  update public.listings l
     set category_id = categorie_id,
         titre = modifier_annonce.titre,
         description = modifier_annonce.description,
         prix_xpf = modifier_annonce.prix_xpf,
         ile = modifier_annonce.ile,
         commune = modifier_annonce.commune,
         statut = 'en_attente_validation',
         motif_refus = null,
         modere_par = null,
         modere_le = null,
         expire_le = null,
         termine_le = null
   where l.id = annonce_id
     and l.user_id = (select auth.uid());

  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.gerer_annonce(bigint, text) from public, anon;
revoke execute on function public.modifier_annonce(bigint, text, text, text, integer, text, text) from public, anon;
grant execute on function public.gerer_annonce(bigint, text) to authenticated;
grant execute on function public.modifier_annonce(bigint, text, text, text, integer, text, text) to authenticated;

-- Plus de modification directe par l'annonceur : tout changement passe par modifier_annonce,
-- qui renvoie l'annonce à la validation.
drop policy "annonces : modification par l'annonceur" on public.listings;
revoke update (category_id, titre, description, prix_xpf, suffixe_prix, ile, commune) on public.listings from authenticated;

-- File de l'espace annonceur et purge future des photos
create index if not exists listings_expire_idx on public.listings (expire_le) where statut = 'active';
