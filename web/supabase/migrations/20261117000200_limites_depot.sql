-- Fermer deux abus possibles pour un compte (SPEC.md, section 4 ter) :
-- 1. remplir la file de validation : 5 annonces en attente au plus pour un particulier,
--    20 pour une vitrine ;
-- 2. déposer des fichiers dans le stockage sans passer par le site : seul le serveur dépose
--    et efface les photos (clé secrète), après vérification et traitement par sharp.

-- ───────────────── Limites : en ligne et en attente ─────────────────
-- Vérifiées chaque fois qu'une annonce arrive en ligne (validation, republication) ou en attente
-- (dépôt, modification, ajout de photo, republication d'une annonce jamais validée).
-- Le refus « en attente » porte l'indice (hint) « en_attente » pour un message adapté.

create or replace function public.verifier_limite_annonces() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  nombre integer;
  en_ligne boolean := new.statut = 'active' and (new.expire_le is null or new.expire_le > now());
  deja_en_ligne boolean := tg_op = 'UPDATE' and old.statut = 'active' and (old.expire_le is null or old.expire_le > now());
  en_attente boolean := new.statut = 'en_attente_validation';
  deja_en_attente boolean := tg_op = 'UPDATE' and old.statut = 'en_attente_validation';
begin
  if en_ligne and not deja_en_ligne then
    if new.shop_id is null then
      select count(*) into nombre from public.listings
        where user_id = new.user_id and shop_id is null and id is distinct from new.id
          and statut = 'active' and (expire_le is null or expire_le > now());
      if nombre >= 5 then
        raise exception 'Limite atteinte : un particulier a 5 annonces actives au plus.'
          using errcode = 'check_violation';
      end if;
    else
      select count(*) into nombre from public.listings
        where shop_id = new.shop_id and id is distinct from new.id and statut = 'active';
      if nombre >= 20 then
        raise exception 'Limite atteinte : une vitrine a 20 annonces actives au plus.'
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  if en_attente and not deja_en_attente then
    if new.shop_id is null then
      select count(*) into nombre from public.listings
        where user_id = new.user_id and shop_id is null and id is distinct from new.id
          and statut = 'en_attente_validation';
      if nombre >= 5 then
        raise exception 'Limite atteinte : un particulier a 5 annonces en attente de validation au plus.'
          using errcode = 'check_violation', hint = 'en_attente';
      end if;
    else
      select count(*) into nombre from public.listings
        where shop_id = new.shop_id and id is distinct from new.id and statut = 'en_attente_validation';
      if nombre >= 20 then
        raise exception 'Limite atteinte : une vitrine a 20 annonces en attente de validation au plus.'
          using errcode = 'check_violation', hint = 'en_attente';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ───────────────── Stockage des photos : plus de dépôt direct par un compte ─────────────────
-- L'espace reste public en lecture (adresses au hasard). L'administrateur garde son accès.

drop policy "photos stockage : lecture par l'annonceur" on storage.objects;
drop policy "photos stockage : dépôt par l'annonceur" on storage.objects;
drop policy "photos stockage : suppression par l'annonceur" on storage.objects;
