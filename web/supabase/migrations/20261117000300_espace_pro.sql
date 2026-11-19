-- Hoko : espace pro (SPEC.md, section 4 sexies).
--
-- 1. Une annonce de vitrine n'est publique que si sa vitrine est en ligne (active et vérifiée).
-- 2. Un pro dépose dans sa vitrine, jamais parmi les annonces de particuliers.
-- 3. Un pro ajoute des photos à ses annonces, comme un particulier.
-- 4. Le pro modifie le profil de sa vitrine par une fonction (secteur et catégorie cohérents,
--    longueurs vérifiées) ; le nom de l'entreprise reste celui qui a été contrôlé.
-- 5. L'administrateur voit les vitrines (avec l'e-mail du compte, pour demander les documents
--    de la DICP) et décide : badge « Pro vérifié », activation, suspension.

-- ───────────────── 1. Annonces de vitrine : publiques seulement si la vitrine est en ligne ─────────────────

drop policy "annonces : lecture publique" on public.listings;
create policy "annonces : lecture publique" on public.listings
  for select to anon, authenticated
  using (
    (
      statut = 'active'
      and (expire_le is null or expire_le > now())
      and (
        shop_id is null
        or exists (select 1 from public.shops s where s.id = shop_id and s.statut = 'actif' and s.verifie)
      )
    )
    or user_id = (select auth.uid())
    or private.is_admin()
  );

-- ───────────────── 2. Dépôt : particulier hors vitrine, pro dans sa vitrine ─────────────────

drop policy "annonces : dépôt" on public.listings;
create policy "annonces : dépôt" on public.listings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and statut = 'en_attente_validation'
    and boost_jusqu_au is null
    and expire_le is null
    and (
      (shop_id is null and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'particulier'))
      or exists (select 1 from public.shops s where s.id = shop_id and s.user_id = (select auth.uid()))
    )
  );

-- ───────────────── 3. Photos : aussi pour les annonces de vitrine ─────────────────

create or replace function public.ajouter_photo(annonce_id bigint, chemin text)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  a public.listings%rowtype;
  nombre integer;
  nouvelle bigint;
begin
  select * into a from public.listings
   where id = annonce_id and user_id = (select auth.uid())
   for update;
  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;
  -- Le fichier doit être dans le dossier de cette annonce, au nom attendu
  if chemin !~ ('^' || (select auth.uid())::text || '/' || annonce_id::text || '/[0-9a-f-]{36}\.jpg$') then
    raise exception 'Chemin de photo invalide.' using errcode = '22023';
  end if;

  select count(*) into nombre from public.photos where listing_id = annonce_id;
  if nombre >= 6 then
    raise exception 'Une annonce a 6 photos au plus.' using errcode = 'check_violation';
  end if;

  insert into public.photos (listing_id, chemin, ordre)
  values (annonce_id, chemin, nombre)
  returning id into nouvelle;

  if a.statut <> 'en_attente_validation' then
    update public.listings
       set statut = 'en_attente_validation', motif_refus = null, modere_par = null, modere_le = null,
           expire_le = null, termine_le = null
     where id = annonce_id;
  end if;
  return nouvelle;
end;
$$;

-- ───────────────── 4. Profil de la vitrine ─────────────────

alter table public.shops
  add constraint shops_presentation_longueur check (char_length(presentation) <= 1000),
  add constraint shops_horaires_nombre check (coalesce(array_length(horaires, 1), 0) <= 7);

-- Plus d'écriture directe par le pro : tout passe par modifier_vitrine
drop policy "vitrines : modification par le pro" on public.shops;
revoke update (nom, secteur, category_id, ile, commune, presentation, horaires) on public.shops from authenticated;

/**
 * Modifie le profil de la vitrine du compte connecté. Le secteur affiché est le nom de la
 * catégorie choisie. Le nom de l'entreprise, le statut et le badge ne changent pas ici.
 */
create function public.modifier_vitrine(
  categorie text,
  ile text,
  commune text,
  presentation text,
  horaires text[]
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  c public.categories%rowtype;
  presentation_nette text := trim(coalesce(presentation, ''));
  commune_nette text := regexp_replace(trim(coalesce(commune, '')), '\s+', ' ', 'g');
  lignes text[];
begin
  select * into c from public.categories where slug = categorie;
  if not found then
    raise exception 'Secteur inconnu.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(ile, ''))) = 0 or char_length(ile) > 40 then
    raise exception 'Île invalide.' using errcode = '22023';
  end if;
  if char_length(commune_nette) = 0 or char_length(commune_nette) > 60 then
    raise exception 'Commune invalide.' using errcode = '22023';
  end if;
  if char_length(presentation_nette) > 1000 then
    raise exception 'La présentation dépasse 1 000 caractères.' using errcode = '22023';
  end if;
  -- L'e-mail n'est jamais affiché sur Hoko : le contact passe par le téléphone
  if presentation_nette ~ '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z0-9.]+' then
    raise exception 'Pas d''adresse e-mail dans la présentation.' using errcode = '22023';
  end if;

  select coalesce(array_agg(trim(l)), '{}') into lignes
    from unnest(coalesce(horaires, '{}')) l
   where trim(l) <> '';
  if coalesce(array_length(lignes, 1), 0) > 7 then
    raise exception '7 lignes d''horaires au plus.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(lignes) l where char_length(l) > 60) then
    raise exception 'Une ligne d''horaires dépasse 60 caractères.' using errcode = '22023';
  end if;

  update public.shops
     set secteur = c.nom,
         category_id = c.id,
         ile = trim(modifier_vitrine.ile),
         commune = commune_nette,
         presentation = presentation_nette,
         horaires = lignes
   where user_id = (select auth.uid());
  if not found then
    raise exception 'Vitrine introuvable.' using errcode = 'P0002';
  end if;
end;
$$;

-- ───────────────── 5. Administration des vitrines ─────────────────

/**
 * Toutes les vitrines, pour l'administrateur : celles en attente de paiement d'abord, puis
 * les plus récentes. Donne l'e-mail du compte (pour demander les documents de la DICP),
 * le téléphone et le numéro TAHITI, que seul l'administrateur voit.
 */
create function public.vitrines_admin()
returns table (
  id uuid,
  slug text,
  nom text,
  secteur text,
  ile text,
  commune text,
  statut text,
  verifie boolean,
  numero_tahiti text,
  telephone text,
  email text,
  annonces_en_ligne integer,
  creee_le timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Réservé à l''administrateur.' using errcode = '42501';
  end if;
  return query
    select s.id, s.slug, s.nom, s.secteur, s.ile, s.commune, s.statut, s.verifie,
           sp.numero_tahiti, sp.telephone, u.email::text,
           (select count(*)::integer from public.listings l where l.shop_id = s.id and l.statut = 'active'),
           s.created_at
      from public.shops s
      left join public.shop_private sp on sp.shop_id = s.id
      left join auth.users u on u.id = s.user_id
     order by (s.statut = 'en_attente_paiement') desc, s.created_at desc
     limit 200;
end;
$$;

/**
 * Décision de l'administrateur sur une vitrine :
 * « verifier » (documents reçus et contrôlés : badge « Pro vérifié »), « retirer_badge »,
 * « activer » (abonnement reçu), « suspendre » (abonnement non payé ou abus).
 */
create function public.decider_vitrine(vitrine_id uuid, geste text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Réservé à l''administrateur.' using errcode = '42501';
  end if;

  if geste = 'verifier' then
    update public.shops set verifie = true where id = vitrine_id;
  elsif geste = 'retirer_badge' then
    update public.shops set verifie = false where id = vitrine_id;
  elsif geste = 'activer' then
    update public.shops set statut = 'actif' where id = vitrine_id;
  elsif geste = 'suspendre' then
    update public.shops set statut = 'suspendu' where id = vitrine_id;
  else
    raise exception 'Geste inconnu : %', geste using errcode = '22023';
  end if;

  if not found then
    raise exception 'Vitrine introuvable.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.modifier_vitrine(text, text, text, text, text[]) from public, anon;
revoke execute on function public.vitrines_admin() from public, anon;
revoke execute on function public.decider_vitrine(uuid, text) from public, anon;
grant execute on function public.modifier_vitrine(text, text, text, text, text[]) to authenticated;
grant execute on function public.vitrines_admin() to authenticated;
grant execute on function public.decider_vitrine(uuid, text) to authenticated;
