-- Hoko : ce dont les pages publiques ont besoin pour lire la base.

-- ───────────────── « Voir le numéro » ─────────────────
-- Le téléphone vit dans des tables privées (profiles, shop_private) que le public ne lit pas.
-- Ces deux fonctions donnent un seul numéro à la fois, seulement pour une annonce en ligne ou
-- une vitrine active et vérifiée, et comptent chaque demande (statistique « contacts reçus »).
-- À ajouter avant l'ouverture : une limite de demandes par visiteur.

create function public.voir_numero_annonce(annonce_id bigint)
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
     -- Une annonce pro ne donne son numéro que si sa vitrine est en ligne
     and (l.shop_id is null or (s.statut = 'actif' and s.verifie));
  if numero is null then
    return null;
  end if;
  insert into public.contact_reveals (listing_id) values (annonce_id);
  return numero;
end;
$$;

create function public.voir_numero_vitrine(vitrine_slug text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  boutique uuid;
  numero text;
begin
  select s.id, sp.telephone into boutique, numero
    from public.shops s
    join public.shop_private sp on sp.shop_id = s.id
   where s.slug = vitrine_slug
     and s.statut = 'actif'
     and s.verifie;
  if numero is null then
    return null;
  end if;
  insert into public.contact_reveals (shop_id) values (boutique);
  return numero;
end;
$$;

revoke execute on function public.voir_numero_annonce(bigint) from public;
revoke execute on function public.voir_numero_vitrine(text) from public;
grant execute on function public.voir_numero_annonce(bigint) to anon, authenticated;
grant execute on function public.voir_numero_vitrine(text) to anon, authenticated;

-- ───────────────── Recherche ─────────────────
-- Insensible aux accents et à la casse (« pirogue » trouve « Pirogue », « vehicule » trouve
-- « Véhicules »). Cherche dans le titre, la catégorie, la commune et l'île des annonces de
-- particuliers en ligne. `security invoker` : les règles d'accès s'appliquent comme d'habitude.

create extension if not exists unaccent with schema extensions;

create function public.rechercher_annonces(recherche text)
returns setof public.listings
language sql stable security invoker set search_path = ''
as $$
  select l.*
    from public.listings l
    join public.categories c on c.id = l.category_id
   where l.statut = 'active'
     and l.shop_id is null
     and extensions.unaccent(lower(l.titre || ' ' || c.nom || ' ' || l.commune || ' ' || l.ile))
         like '%' || replace(replace(replace(extensions.unaccent(lower(trim(recherche))), '\', '\\'), '%', '\%'), '_', '\_') || '%'
   order by l.created_at desc
   limit 100;
$$;
