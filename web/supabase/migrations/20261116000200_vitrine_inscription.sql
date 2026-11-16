-- Hoko : à l'inscription d'un pro, sa vitrine est créée en même temps que son compte.
--
-- Pourquoi dans la base : avec la confirmation par e-mail, l'inscription ne connecte pas la
-- personne tout de suite, le site ne peut donc pas créer la vitrine en son nom. Le déclencheur
-- le fait à partir des informations du formulaire, déjà vérifiées par le serveur du site.
--
-- La vitrine naît « en attente de paiement » et sans badge : l'administrateur contrôle le
-- numéro TAHITI et active la vitrine à réception de l'abonnement.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  infos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  boutique uuid;
  base_slug text;
begin
  insert into public.profiles (id, role, nom, telephone)
  values (
    new.id,
    case when infos ->> 'type' = 'pro' then 'pro' else 'particulier' end,
    infos ->> 'nom',
    infos ->> 'telephone'
  );

  if infos ->> 'type' = 'pro' then
    -- Adresse de la vitrine : le nom sans accents ni espaces, suivi d'un morceau de
    -- l'identifiant pour qu'elle soit unique (« garage-du-lagon-3f9a1c »)
    base_slug := lower(infos ->> 'nom');
    base_slug := translate(base_slug, 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa');
    base_slug := trim(both '-' from regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g'));
    base_slug := left(coalesce(nullif(base_slug, ''), 'pro'), 40);

    insert into public.shops (user_id, slug, nom, secteur, category_id, ile, commune)
    select
      new.id,
      base_slug || '-' || left(replace(new.id::text, '-', ''), 6),
      infos ->> 'nom',
      c.nom,
      c.id,
      infos ->> 'ile',
      infos ->> 'commune'
    from public.categories c
    where c.slug = infos ->> 'secteur'
    returning id into boutique;

    if boutique is null then
      raise exception 'Secteur inconnu : %', infos ->> 'secteur' using errcode = 'check_violation';
    end if;

    insert into public.shop_private (shop_id, numero_tahiti, telephone)
    values (boutique, infos ->> 'numeroTahiti', infos ->> 'telephone');
  end if;

  return new;
end;
$$;
