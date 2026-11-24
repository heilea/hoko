-- Hoko : index de l'accueil et de la recherche, avant d'avoir des milliers d'annonces.
--
-- Sans eux, la base relit toutes les annonces en ligne à chaque affichage de l'accueil et à
-- chaque recherche. Résultats identiques à avant : seule la vitesse change.

-- ───────────────── Accueil ─────────────────
-- Annonces de particuliers en ligne, les plus récentes d'abord (12 par page).
-- L'index par catégorie (listings_publiques_idx) ne sert pas quand on mélange les catégories.
create index listings_accueil_idx on public.listings (created_at desc)
  where statut = 'active' and shop_id is null;

-- ───────────────── Recherche ─────────────────
-- « pirogue » doit trouver « Pirogue V1 carbone » : on cherche un morceau de texte n'importe où,
-- accents et majuscules ignorés. Un index classique ne sait pas faire ça ; l'index « trigrammes »
-- (extension pg_trgm) découpe le texte en morceaux de 3 lettres et retrouve les annonces qui
-- contiennent ces morceaux.
create extension if not exists pg_trgm with schema extensions;

-- Un index n'accepte que des fonctions « immutables ». unaccent ne l'est pas par défaut (son
-- dictionnaire pourrait changer) : on fige le dictionnaire, comme le recommande PostgreSQL.
create function private.sans_accents(texte text)
returns text
language sql immutable parallel safe strict set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, lower(texte)) $$;
grant execute on function private.sans_accents(text) to anon, authenticated;

-- Le titre, la commune et l'île sont dans la table des annonces : indexés ensemble.
create index listings_recherche_idx on public.listings
  using gin (private.sans_accents(titre || ' ' || commune || ' ' || ile) extensions.gin_trgm_ops)
  where statut = 'active' and shop_id is null;

-- Même recherche qu'avant (titre, catégorie, commune, île ; % et _ cherchés tels quels), écrite
-- pour utiliser l'index. Le texte et la catégorie (dans une autre table) sont cherchés séparément
-- puis réunis : avec un simple « ou », la base relisait toutes les annonces (mesuré sur 20 000
-- annonces : 256 ms avec « ou », 3 ms ainsi).
create or replace function public.rechercher_annonces(recherche text)
returns setof public.listings
language sql stable security invoker set search_path = ''
as $$
  with motif as (
    select '%' || replace(replace(replace(private.sans_accents(trim(recherche)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as texte
  ),
  trouvees as (
    select a.id
      from public.listings a, motif
     where a.statut = 'active' and a.shop_id is null
       and private.sans_accents(a.titre || ' ' || a.commune || ' ' || a.ile) like motif.texte
    union
    select a.id
      from public.listings a, motif
     where a.statut = 'active' and a.shop_id is null
       and a.category_id in (select c.id from public.categories c where private.sans_accents(c.nom) like motif.texte)
  )
  select l.*
    from public.listings l
   where l.id in (select id from trouvees)
     and (l.expire_le is null or l.expire_le > now())
   order by l.created_at desc
   limit 100;
$$;
